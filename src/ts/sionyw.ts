import { hubURL } from "./characterCards";
import { fetchNative } from "./globalApi.svelte";
import { DBState } from "./stores.svelte";
import { readFile, BaseDirectory, writeFile } from "@tauri-apps/plugin-fs";
import { isTauri } from "src/ts/platform"
import * as client from 'openid-client'

let accessToken = ''
let refreshToken = ''
let tokenInitalized = false
let tokenExpiry = 0 // Unix timestamp in milliseconds

interface SionywOauthData {
    refresh_token: string;
    client_id: string;
    client_secret: string;
}

interface ProtectedResourceArg {
    retries?: number;
    forceRefresh?: boolean;
}

function getHub(){
    return hubURL
}

//These might look unsecure in first glance,
//But we use DPoP tokens which are bound to a keypair stored in indexedDB,
//making it hard to intercept the tokens even if access_token and refresh_token are stored in localStorage or filesystem.

export async function fetchProtectedResource(url: string, options: RequestInit = {}, arg:ProtectedResourceArg = {}) {
    //risuAuth is for backward compatibility, which is unsecurely stored in localStorage
    //if risuAuth is empty string, it means we should use the safely stored tokens

    const hub = getHub()
    if(url.startsWith('/')){
        url = hub + url
    }

    let risuAuth = ''

    //this option is for development and debugging purposes only
    //for production, DBState.db.account.token should be removed entirely
    if(localStorage.getItem('ignoreRisuAuth') !== 'true'){
        risuAuth = DBState.db?.account?.token
        let fallBackRisuToken = localStorage.getItem("fallbackRisuToken")
        if(!risuAuth && fallBackRisuToken){
            try {
                const tokenObj = JSON.parse(fallBackRisuToken)
                risuAuth = tokenObj.token || ''
            } catch (error) {
                risuAuth = ''
            }
        }
    }

    // return fetchProtectedResourceSPA(url, options, arg)
    if(risuAuth){
        return fetchProtectedResourceRisuAuthVersion(url, options, risuAuth, arg)
    }
    return fetchProtectedResourceSPA(url, options, arg)
}

const readFileUnSecure = isTauri ? readFile : async (path:string, options:any) => {
    const data = localStorage.getItem(path)
    if(!data){
        throw new Error("File not found")
    }
    return Buffer.from(data, 'base64')
}

const writeFileUnSecure = isTauri ? writeFile : async (path:string, data:Uint8Array, options:any) => {
    localStorage.setItem(path, Buffer.from(data).toString('base64'))
}


//Tauri version of fetchProtectedResource
//We can contect javascript safely because its hard to intercept the requests in Tauri
async function fetchProtectedResourceSPA(url: string, options: RequestInit = {}, arg:ProtectedResourceArg = {}) {
    const retries = arg.retries || 0
    if(tokenExpiry - Date.now() < 60000){ // If token expires in less than 60 seconds
        tokenInitalized = false
    }
    
    if(!tokenInitalized || arg.forceRefresh){

        const oauthDataText = await readFileUnSecure('oauthData.json', { baseDir: BaseDirectory.AppData })
        const oauthData: SionywOauthData = JSON.parse(new TextDecoder().decode(oauthDataText))

        refreshToken = oauthData.refresh_token
        if(!refreshToken){
            return badLoginResponse("No refresh token")
        }
        for(let attempt = 0; attempt < 2; attempt++){

            try {
                const config = await client.discovery(
                    new URL('https://account.sionyw.com/'),
                    oauthData.client_id,
                    oauthData.client_secret
                )

                const dPoPKeyPair = await getDPoPKeys()
                if(!dPoPKeyPair){
                    return badLoginResponse("No DPoP keys found")
                }
                const DPoP = client.getDPoPHandle(config, dPoPKeyPair)

                //check dpop keys are extractable
                const extractable = await crypto.subtle.exportKey("jwk", dPoPKeyPair.privateKey).then(() => true).catch(() => false)
                if(extractable){
                    return badLoginResponse("DPoP keys are extractable")
                }

                let refreshedTokens: client.TokenEndpointResponse = await client.refreshTokenGrant(
                    config,
                    oauthData.refresh_token,
                    undefined,
                    { DPoP: DPoP}
                )

                accessToken = refreshedTokens.access_token!
                const newRefresh = oauthData.refresh_token
                tokenExpiry = Date.now() + (refreshedTokens.expires_in! * 1000)
                tokenInitalized = true

                if(newRefresh && newRefresh !== oauthData.refresh_token){
                    //Store the new refresh token securely
                    await writeFileUnSecure('oauthData.json', new TextEncoder().encode(JSON.stringify({
                        refresh_token: newRefresh,
                        client_id: oauthData.client_id,
                        client_secret: oauthData.client_secret,
                    })), { baseDir: BaseDirectory.AppData })
                }

                break

            } catch (error) {
                console.error("Failed to refresh token:", error)
            }
        }
    }

    const res = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            "Authorization": `Bearer ${accessToken}`
        }
    })

    if(res.headers.get('WWW-Authenticate')?.includes('invalid_token')){
        tokenInitalized = false
        if(retries < 3){
            return fetchProtectedResourceSPA(url, options, { retries: retries + 1 })
        }
        else{
            return badLoginResponse()
        }
    }

    return res
}

function badLoginResponse(message = "Bad Login"){
    return new Response(message, {
        status: 403,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "text/plain",
            "Cache-Control": "no-store",
            "Pragma": "no-cache",
            'WWW-Authenticate': `Bearer error="invalid_token", error_description="The access token is invalid or has expired"`,
        }
    })
}

async function fetchProtectedResourceRisuAuthVersion(url: string, options: RequestInit = {}, risuAuth: string, arg:ProtectedResourceArg = {}) {
    const res = await fetch(url, {
        ...options,
        headers: {
            'x-risu-auth': risuAuth,
            ...options.headers
        }
    })
    return res
}

function openDpopDB():Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("DPoPDB", 1);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains("DPoPStore")) {
                db.createObjectStore("DPoPStore");
            }
        };

        request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
        request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
    });
}

async function saveDPoPKeys(keyPair: CryptoKeyPair) {
    const db = await openDpopDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("DPoPStore", 'readwrite');
        const store = tx.objectStore("DPoPStore");

        const data = {
            privateKey: keyPair.privateKey,
            publicKey: keyPair.publicKey,
        };

        const request = store.put(data, 'dpop');

        request.onsuccess = () => resolve(true);
        request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
}

async function getDPoPKeys():Promise<CryptoKeyPair | null> {
    const db = await openDpopDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("DPoPStore", 'readonly');
        const store = tx.objectStore("DPoPStore");
        const request = store.get('dpop');

        request.onsuccess = (event) => {
            const result = (event.target as IDBRequest).result;
            if (result) {
                resolve({
                    privateKey: result.privateKey,
                    publicKey: result.publicKey,
                } as CryptoKeyPair);
            } else {
                resolve(null);
            }
        };

        request.onerror = (event) => reject((event.target as IDBRequest).error);
    })
}

export async function loginToSionyw(){
    return loginToSionywSPAVersion()
}

async function loginToSionywSPAVersion(){
    // We should use Oauth2.1 with dynamic client registration
    let config = await client.discovery(
        new URL('https://account.sionyw.com/'),
        'placeholder_client_id',
        'placeholder_secret'
    )
    const a = await fetchNative(config.serverMetadata().registration_endpoint!, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_name: 'Risuai Client',
            redirect_uris: ['risuai://sionyw/callback'],
            grant_types: ['refresh_token', 'authorization_code'],
            response_types: ['code'],
            scope: 'risuai refresh_token',
        })
    })

    
    let dPoPKeyPair
    
    try {
        dPoPKeyPair = await crypto.subtle.generateKey(
            {
                name: 'Ed25519',
            },
            false,
            ["sign", "verify"],
        );
    } catch (error) {
        console.warn("Ed25519 not supported, falling back to P-256 for DPoP keys")
        dPoPKeyPair = await crypto.subtle.generateKey(
            {
                name: "ECDSA",
                namedCurve: "P-256"
            },
            false,
            ["sign", "verify"],
        );
    }
    const DPoP = client.getDPoPHandle(config, dPoPKeyPair)

    const registration = await a.json()
    config = await client.discovery(
        new URL('https://account.sionyw.com/'),
        registration.client_id,
        registration.client_secret
    )

    let code_verifier: string = client.randomPKCECodeVerifier()
    let code_challenge: string =  await client.calculatePKCECodeChallenge(code_verifier)

    const authUrl = await client.buildAuthorizationUrl(config, {
        redirect_uri: 'risuai://sionyw/callback',
        scope: 'risuai refresh_token',
        code_challenge_method: 'S256',
        code_challenge: code_challenge,
        response_mode: 'web_message',
    })

    const xWind = window.open(authUrl, '_blank')
    xWind?.focus()
    const msgEventCallback = async (event:MessageEvent) => {
        if(event.origin.startsWith('https://account.sionyw.com')){
            let response:{
                code:string,
            } = event.data

            if(!response?.code){
                return
            }

            window.removeEventListener('message', msgEventCallback)
            xWind?.close()

            const callbackUrl = new URL('risuai://sionyw/callback')
            callbackUrl.searchParams.set('code', response.code)
            const exchanged = await client.authorizationCodeGrant(
                config,
                callbackUrl,
                {
                    pkceCodeVerifier: code_verifier,
                },
                undefined,
                {
                    DPoP: DPoP
                }
            )

            // Store DPoP key pair securely in indexedDB
            await saveDPoPKeys(dPoPKeyPair)

            // Store the refresh token securely
            await writeFileUnSecure('oauthData.json', new TextEncoder().encode(JSON.stringify({
                refresh_token: exchanged.refresh_token,
                client_id: registration.client_id,
                client_secret: registration.client_secret,
            })), { baseDir: BaseDirectory.AppData })

            accessToken = exchanged.access_token!
            refreshToken = exchanged.refresh_token!
            tokenExpiry = Date.now() + (exchanged.expires_in! * 1000) - 60000 // Refresh 1 minute before expiry
            tokenInitalized = true
            console.log("Sionyw login successful")
        }
    }
    window.addEventListener('message', msgEventCallback)
}

export async function testSionywLogin(){
    const s = await fetchProtectedResource('/hub/account/load', {
        method: "GET"
    })

    console.log(await s.text())
}