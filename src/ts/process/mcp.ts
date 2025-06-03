import { v4 } from "uuid"
import { fetchNative, openURL } from "../globalApi.svelte"
import { DBState } from "../stores.svelte";
import { message } from "@tauri-apps/plugin-dialog";

type MCPPrompt = {
    name: string;              // Unique identifier for the prompt
    description?: string;      // Human-readable description
    arguments?:{               // Optional list of arguments
        name: string;          // Argument identifier
        description?: string;  // Argument description
        required?: boolean;    // Whether argument is required
    }[]
    url?:string
}

type RPCRequestResult = {
    rpc:{
        jsonrpc: "2.0",
        id: number | string,
        result?: any,
        error?: {
        code: number,
        message: string,
        data?: any
        }
    },
    http:{
        status: number,
        headers: Record<string, string>
    }
}


export class MCPClient{
    sessionId:string|null = null
    initialized:boolean = false
    url:string

    constructor(url:string){
        this.url = url
    }

    async request(method:string, params?:any):Promise<RPCRequestResult>{
        const url = this.url
        if(method !== 'initialize' && !this.initialized){
            await this.handshake()
            this.initialized = true
        }

        const body = {
            jsonrpc: "2.0",
            id: v4(),
            method: method,
            params: params
        }

        if(!params){
            delete body.params
        }

        try {

            const headers:Record<string, string> = {
                "Content-Type": "application/json",
                "Accept":  "application/json, text/event-stream"
            }

            if(this.sessionId){
                headers['Mcp-Session-Id'] = this.sessionId
            }

            const response = await fetchNative(url, {
                body: JSON.stringify(body),
                method: "POST",
                headers: headers
            })

            if(this.sessionId && response.status === 404){
                this.sessionId = null
                this.initialized = false
                message("MCP Session expired, reinitializing...")
                return this.request(method, params)
            }

            if(response.headers.has('Mcp-Session-Id') && body.method === 'initialize'){
                this.sessionId = response.headers.get('Mcp-Session-Id')
            }
            return {
                rpc: await response.json(),
                http: {
                    status: response.status,
                    headers: Object.fromEntries(response.headers.entries())
                }
            }
        } catch (error) {
            return {
                rpc: {
                    jsonrpc: "2.0",
                    id: '',
                    error: {
                        code: 400,
                        message: "None"
                    }
                },
                http: {
                    status: 500,
                    headers: {}
                }
            }
        }
    }
    

    async getPromptList(){
        let prompts:MCPPrompt[] = []
        for(let i=0;i<DBState.db.mcpURLs.length;i++){
            const url = DBState.db.mcpURLs[i]
            const res = (await this.request(url, 'prompts/list')).rpc;
            if(res.error){
                console.error(res.error)
            }
            if(res?.result?.prompts){
                const rPrompts:MCPPrompt[] = res?.result?.prompts
                for(let i =0;i<rPrompts.length;i++){
                    const part = rPrompts[i]
                    part.url = url
                    prompts.push(part)
                }
            }
        }

        return prompts

    }
    async loadPrompt(mcpPrompt:MCPPrompt){
        const d = await this.request("prompts/get", {
            name: mcpPrompt.name
        })

        return d
    }

    async listTools(){
        const d = (await this.request("tools/list")).rpc
        if(d?.result?.tools){
            return d.result.tools
        }
        else{
            throw "Failed to list tools"
        }
    }

    
    async handshake(){

        const {rpc:d,http} = await this.request('initialize', {
            "protocolVersion": "2025-03-26",
            "capabilities": {},
            "clientInfo": {
                name: "RS-MCP-CLIENT",
                version: "1.0.0"
            }
        })

        console.log("MCP Handshake Response", d)
        console.log("MCP Handshake HTTP Response", http)

        if(http.status === 401){
            //Needs OAuth
            const OauthDiscovery = new URL(this.url)
            OauthDiscovery.pathname = "/.well-known/oauth-authorization-server"
            console.log("Oauth Discovery URL", OauthDiscovery.toString())
            const oauthResponse = await fetchNative(OauthDiscovery.toString(), {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            })

            //default discovery URLS
            let discoveryURLS = {
                'authorization_endpoint': OauthDiscovery.origin + "/authorize",
                'token_endpoint': OauthDiscovery.origin + "/token",
                'registration_endpoint': OauthDiscovery.origin + "/register",
            }

            if(oauthResponse.status === 200){
                discoveryURLS = await oauthResponse.json()
            }

            const redirectURL = "https://sv.risuai.xyz/oauthhelper" //Just a placeholder, should be replaced with actual redirect URL

            const registerResponse = await fetchNative(discoveryURLS.registration_endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept":  "application/json"
                },
                body: JSON.stringify({
                    client_name: "RS-MCP-CLIENT",
                    redirect_uris: [redirectURL],
                    response_types: ["code"],
                    grant_types: ["authorization_code"],
                    token_endpoint_auth_method: "client_secret_basic"
                })
            })

            if(registerResponse.status !== 201){
                throw new Error("Failed to register client with OAuth server")
            }

            const clientData = await registerResponse.json()
            console.log("Registered Client Data", clientData)

            const authUrl = new URL(discoveryURLS.authorization_endpoint)
            authUrl.searchParams.set("client_id", clientData.client_id)
            authUrl.searchParams.set("response_type", "code")
            authUrl.searchParams.set("redirect_uri", redirectURL)
            authUrl.searchParams.set("scope", "openid profile email")
            authUrl.searchParams.set("state", v4())

            console.log("Authorization URL", authUrl.toString())

            const iframe = document.createElement("iframe")
            iframe.src = authUrl.toString()
            iframe.style.display = "absolute"
            iframe.style.width = "100%"
            iframe.style.height = "100%"
            iframe.style.zIndex = "99999"
            document.body.appendChild(iframe)
            const rurl = await new Promise<URL>((resolve, reject) => {
                iframe.onerror = (e) => {
                    document.body.removeChild(iframe)
                    reject(e)
                }
                window.addEventListener("message", (event) => {
                    if(event.origin !== new URL(redirectURL).origin){
                        return
                    }
                    if(event.data && event.data.type === "oauth"){
                        document.body.removeChild(iframe)
                        resolve(new URL(event.data.url))
                    }
                }, { once: true })
            })
            
            const tokenResponse = await fetchNative(discoveryURLS.token_endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: (new URLSearchParams({
                    grant_type: "authorization_code",
                    code: rurl.searchParams.get("code") || "",
                    redirect_uri: redirectURL,
                    client_id: clientData.client_id,
                    client_secret: clientData.client_secret
                })).toString()
            })

            if(tokenResponse.status !== 200){
                throw new Error("Failed to exchange authorization code for access token")
            }

            const tokenData = await tokenResponse.json()
            console.log("Access Token Data", tokenData)


            throw new Error('Not Implemented Yet')
        }

        if(d?.result?.serverInfo){
            console.log("MCP Handshake successful", d)
            const serverInfo:{
                name:string,
                version:string,
                warnings:string[]
            } = d.result.serverInfo

            await fetchNative(this.url, {
                body: JSON.stringify({
                    "jsonrpc": "2.0",
                    "method": "notifications/initialized"
                }),
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept":  "application/json, text/event-stream"
                }
            })
            
            if(d?.result?.protocolVersion !== "2025-03-26"){
                serverInfo.warnings.push(`Protocol version is ${d?.result?.protocolVersion}, expected "2025-03-26"`)
            }

            return serverInfo
        }
        else{
            throw "MCP Handshake Failed"
        }
    }
}