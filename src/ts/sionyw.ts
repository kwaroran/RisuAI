import { hubURL } from "./characterCards";
import { fetchNative, forageStorage, isNodeServer, isTauri } from "./globalApi.svelte";
import type { NodeStorage } from "./storage/nodeStorage";
import { DBState } from "./stores.svelte";
import { readFile, BaseDirectory, writeFile } from "@tauri-apps/plugin-fs";
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
}

function getHub(){
    return hubURL
}

export async function fetchProtectedResource(url: string, options: RequestInit = {}, arg:ProtectedResourceArg = {}) {
    //risuAuth is for backward compatibility, which is unsecurely stored in localStorage
    //Safely stored tokens are handled differently based on the platform
    //if risuAuth is empty string, it means we should use the safely stored tokens

    const hub = getHub()
    if(url.startsWith('/')){
        url = hub + url
    }

    let risuAuth = DBState.db?.account?.token || ''
    let fallBackRisuToken = localStorage.getItem("fallbackRisuToken")
    if(!risuAuth && fallBackRisuToken){
        try {
            const tokenObj = JSON.parse(fallBackRisuToken)
            risuAuth = tokenObj.token || ''
        } catch (error) {
            risuAuth = ''
        }
    }    

    if(risuAuth){
        return fetchProtectedResourceRisuAuthVersion(url, options, risuAuth, arg)
    }
    else if(isNodeServer){
        return fetchProtectedResourceNodeVersion(url, options, arg)
    }
    else if(isTauri){
        return fetchProtectedResourceTauri(url, options, arg)
    }
    else{
        return fetchProtectedResourceWebVersion(url, options, arg)
    }
}

//This method is used in the web version of the app
//It uses cookies, so no additional credentials are needed
async function fetchProtectedResourceWebVersion(url: string, options: RequestInit = {}, arg:ProtectedResourceArg = {}) {

    const res = await fetch(url, {
        ...options,
    })

    if(res.headers.get('WWW-Authenticate')?.includes('invalid_token')){
        if(arg.retries && arg.retries < 3){
            //this refreshes the cookie
            await fetch(hubURL + '/sionyw/refresh')
            return fetchProtectedResourceWebVersion(url, options, { retries: arg.retries + 1 })
        }
        else{
            return badLoginResponse()
        }
    }

    

    return res
}


async function fetchProtectedResourceNodeVersion(url: string, options: RequestInit = {}, arg:ProtectedResourceArg = {}) {

    const res = await fetch('/hub-proxy', {
        ...options,
        headers: {
            ...options.headers,
            "x-risu-node-path": url,
            "risu-auth": (forageStorage.realStorage as NodeStorage).getAuth()
        }
    })

    return res
}

const readFileSecure = isTauri ? readFile : async (path:string, options:any) => {

    if(!import.meta.env.DEV){
        throw new Error("Secure file access is only available in Tauri or development mode")
    }
    const data = localStorage.getItem(path)
    if(!data){
        throw new Error("File not found")
    }
    return Buffer.from(data, 'base64')
}
const writeFileSecure = isTauri ? writeFile : async (path:string, data:Uint8Array, options:any) => {
    if(!import.meta.env.DEV){
        throw new Error("Secure file access is only available in Tauri or development mode")
    }
    localStorage.setItem(path, Buffer.from(data).toString('base64'))
}


//Tauri version of fetchProtectedResource
//We can contect javascript safely because its hard to intercept the requests in Tauri
async function fetchProtectedResourceTauri(url: string, options: RequestInit = {}, arg:ProtectedResourceArg = {}) {
    const retries = arg.retries || 0
    if(tokenExpiry - Date.now() < 60000){ // If token expires in less than 60 seconds
        tokenInitalized = false
    }
    
    if(!tokenInitalized){

        const oauthDataText = await readFileSecure('oauthData.json', { baseDir: BaseDirectory.AppData })
        const oauthData: SionywOauthData = JSON.parse(new TextDecoder().decode(oauthDataText))

        if(!refreshToken){
            return badLoginResponse()
        }

        try {
            const config = await client.discovery(
                new URL('https://account.sionyw.com/'),
                oauthData.client_id,
                oauthData.client_secret
            )

            let refreshedTokens: client.TokenEndpointResponse = await client.refreshTokenGrant(
                config,
                oauthData.refresh_token,
            )

            accessToken = refreshedTokens.access_token!
            refreshToken = refreshedTokens.refresh_token!
            tokenExpiry = Date.now() + (refreshedTokens.expires_in! * 1000)
            tokenInitalized = true
        } catch (error) {
            return badLoginResponse()
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
            return fetchProtectedResourceTauri(url, options, { retries: retries + 1 })
        }
        else{
            return badLoginResponse()
        }
    }

    return res
}

function badLoginResponse(){
    return new Response("Bad Login", {
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

export async function loginToSionyw(){
    // if(isNodeServer){
    //     return loginToSionywNodeVersion()
    // }
    // else if(isTauri){
    //     return loginToSionywTauriVersion()
    // }
    // else{
    //     return loginToSionywWebVersion()
    // }   
            return loginToSionywTauriVersion()

}

async function loginToSionywNodeVersion(){
    location.href = '/sionyw/login'
}

async function loginToSionywTauriVersion(){
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
            client_name: 'RisuAI Local',
            redirect_uris: ['risuai://sionyw/callback'],
            grant_types: ['refresh_token', 'authorization_code'],
            response_types: ['code'],
            scope: 'risuai refresh_token',
        })
    })
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
                    pkceCodeVerifier: code_verifier
                }
            )

            // Store the refresh token securely
            await writeFileSecure('oauthData.json', new TextEncoder().encode(JSON.stringify({
                refresh_token: exchanged.refresh_token,
                client_id: registration.client_id,
                client_secret: registration.client_secret,
            })), { baseDir: BaseDirectory.AppData })

            accessToken = exchanged.access_token!
            refreshToken = exchanged.refresh_token!
            tokenExpiry = Date.now() + (exchanged.expires_in! * 1000) - 60000 // Refresh 1 minute before expiry
            tokenInitalized = true
        }
    }
    window.addEventListener('message', msgEventCallback)
}
async function loginToSionywWebVersion(){
    location.href = getHub() + '/sionyw/login'
}