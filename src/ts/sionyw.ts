import { hubURL } from "./characterCards";
import { DBState } from "./stores.svelte";
import { readFile, BaseDirectory } from "@tauri-apps/plugin-fs";
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
    let hub = hubURL
    if(DBState?.db?.hubServerType === 'nightly'){
        hub = `https://nightly.sv.risuai.xyz`
    }
    return hub
}

export async function fetchProtectedResource(url: string, options: RequestInit = {}) {
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

//Tauri version of fetchProtectedResource
//We can contect javascript safely because its hard to intercept the requests in Tauri
async function fetchProtectedResourceTauri(url: string, options: RequestInit = {}, arg:ProtectedResourceArg = {}) {
    const retries = arg.retries || 0
    if(tokenExpiry - Date.now() < 60000){ // If token expires in less than 60 seconds
        tokenInitalized = false
    }
    
    if(!tokenInitalized){

        const oauthDataText = await readFile('oauthData.txt', { baseDir: BaseDirectory.AppData })
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