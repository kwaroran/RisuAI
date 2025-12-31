import { v4 } from "uuid"
import { fetchNative, openURL } from "../../globalApi.svelte"
import { alertInput } from "../../alert";

export type MCPPrompt = {
    name: string;              // Unique identifier for the prompt
    description?: string;      // Human-readable description
    arguments?:{               // Optional list of arguments
        name: string;          // Argument identifier
        description?: string;  // Argument description
        required?: boolean;    // Whether argument is required
    }[]
    url?:string
}

export type MCPTool ={
    name: string
    description: string
    inputSchema: any // JSON schema for input validation
    annotations?: any // Annotations for the tool, can be used for documentation or metadata
}

export type JsonRPC = {
    jsonrpc: "2.0",
    id: number | string,
    result?: any,
    error?: {
        code: number,
        message: string,
        data?: any
    }
}

export type JsonPing = {
    jsonrpc: "2.0",
    id: string,
    method: "ping"
}

export type RPCRequestResult = {
    rpc:JsonRPC,
    http:{
        status: number,
        headers: Record<string, string>
    }
}

export type SseEventDetail = {
    mcpClientObjectId: string,
    data: JsonRPC
}

export type RPCToolCallTextContent = {
    type: 'text',
    text: string
}

export type RPCToolCallImageAudioContent = {
    type: 'image'|'audio',
    data: string // Base64 encoded image
    mimeType: string // e.g. 'image/png', 'image/jpeg'
}

export type RPCToolCallContentResource = {
    type: "resource",
    resource: {
        uri: string,
        mimeType: string,
        text: string
    }
}

export type RPCToolCallContent = RPCToolCallTextContent | RPCToolCallImageAudioContent | RPCToolCallContentResource


export class MCPClient{
    mcpClientObjectId:string = v4()
    sessionId:string|null = null
    initialized:boolean = false
    url:string
    sseEndpoint:string
    accessToken:string|null = null
    sseResponses:Record<string, JsonRPC> = {}
    sseIdDone:Set<string|number> = new Set()
    protocolVersion:'2025-03-26' | '2024-11-05' = '2025-03-26'
    sses:{
        stream:ReadableStream,
        abortController?:AbortController
    }[] = []
    customTransport?: {
        send: (message:JsonRPC) => void|Promise<void>,
        addListener: (callback:(message:JsonRPC) => void|Promise<void>) => void,
        removeListener: (callback:(message:JsonRPC) => void|Promise<void>) => void
    }
    onDestroy: (() => void) | null = null
    serverInfo: {
        protocolVersion: string,
        capabilities: {
            [key: string]: any
        },
        serverInfo: {
            name: string,
            version: string
        },
        instructions?: string
    }
    cached:{
        prompts?: MCPPrompt[],
        tools?: MCPTool[]
    } = {
        prompts: [],
        tools: []
    }
    registerRefreshToken: ((arg: {
        clientId:string
        clientSecret:string
        refreshToken:string
        tokenUrl:string
    }) => void) | null = null

    getRefreshToken: (() => Promise<{
        clientId:string
        clientSecret:string
        refreshToken:string
        tokenUrl:string
    }>) | null = null

    constructor(url:string, arg:{
        accessToken?:string
        debug?:boolean
    } = {}){
        this.url = url
        if(arg.accessToken){
            this.accessToken = arg.accessToken
        }
    }

    async connectSSE(stream:ReadableStream, abortController?:AbortController){
        const reader = stream.getReader()
        const decoder = new TextDecoder("utf-8")
        let buffer = ""
        this.sses.push({
            stream: stream,
            abortController: abortController
        })

        while(true){
            const {done, value} = await reader.read()
            if(done) break

            buffer += decoder.decode(value, {stream: true})

            let parts = buffer.split("\n\n")
            buffer = parts.pop() || ""

            for(const part of parts){
                let lines = part.split("\n")
                let data = ""
                let eventName = ""
                for(const line of lines){
                    if(line.startsWith("data: ")){
                        data += line.slice(6) + "\n"
                    }
                    else if(line.startsWith("event: ")){
                        eventName = line.slice(7).trim()
                    }
                }

                data = data.trim()
                if(data){
                    console.log("MCP SSE Data", {
                        eventName: eventName,
                        data: data
                    })

                    if(eventName === 'endpoint'){
                        const sseEventDetail:SseEventDetail = {
                            mcpClientObjectId: this.mcpClientObjectId,
                            data: {
                                jsonrpc: "2.0",
                                id: 'connected',
                                result: {
                                    endpoint: data
                                }
                            }
                        }
                        document.dispatchEvent(new CustomEvent("mcp-sse", {
                            detail: sseEventDetail
                        }))
                    }
                    else{
                        try {
                            const jsonData = JSON.parse(data) as JsonRPC|JsonPing
                            if(this.sseIdDone.has(jsonData.id)){
                                continue
                            }

                            //@ts-expect-error JsonRPC type doesn't have method property, but JsonPing does
                            if(jsonData.method === 'ping'){
                                await this.request('response', {}, {
                                    notifications: true,
                                    initMethod: 'none',
                                    id: jsonData.id
                                })
                                this.sseIdDone.add(jsonData.id)
                                continue
                            }

                            const sseEventDetail:SseEventDetail = {
                                mcpClientObjectId: this.mcpClientObjectId,
                                data: jsonData,
                            }
                            document.dispatchEvent(new CustomEvent("mcp-sse", {
                                detail: sseEventDetail
                            }))
                            this.sseIdDone.add(jsonData.id)
                        } catch (error) {}
                    }
                }
            }
        }        
    }

    async request(method:string, params?:any, options:{
        notifications?:boolean,
        initMethod?:'init' | 'none',
        id?: string|number
    } = {}):Promise<RPCRequestResult>{
        options ??= {}
        const initMethod = options.initMethod || 'none'
        let httpStatus = 500
        const url = this.sseEndpoint ?? this.url


        const body = method === 'response' ? {
            jsonrpc: "2.0",
            id: options?.id ?? v4(),
            result: params
        } : {
            jsonrpc: "2.0",
            id: options?.id ?? v4(),
            method: method,
            params: params
        }

        if(method !== 'response'){
            if(options.notifications){
                delete body.params
                delete body.id
            }

            else if(!params){
                delete body.params
            }
        }

        if(this.customTransport){
            return new Promise<RPCRequestResult>((resolve) => {
                const func = (message:JsonRPC) => {
                    if(message.id === body.id){
                        resolve({
                            rpc: message,
                            http: {
                                status: 200,
                                headers: {}
                            }
                        })
                        this.customTransport.removeListener(func)
                    }
                }
                Promise.resolve(this.customTransport.addListener(func))
                    .then(() => this.customTransport.send(body as JsonRPC))
                    // TODO: handle send errors properly (e.g. timeout, reject with RPC error)
                    .catch(() => {})
            })
        }

        try {

            const headers:Record<string, string> = !this.sseEndpoint ? {
                "Content-Type": "application/json",
                "Accept":  "application/json, text/event-stream"
            } : {
                "Content-Type": "application/json",
                "Accept":  "*/*"
            }

            if(this.sessionId){
                headers['Mcp-Session-Id'] = this.sessionId
            }

            if(this.accessToken){
                headers['Authorization'] = `Bearer ${this.accessToken}`
            }

            const abortController = new AbortController()
            const requestParams = {
                body: JSON.stringify(body),
                method:  "POST",
                headers: headers,
                signal: abortController.signal
            } as {
                body?: string,
                method: "GET" | "POST",
                headers: Record<string, string>,
                signal?: AbortSignal
            }

            if(requestParams.method === "GET"){
                delete requestParams.body
            }

            let responsePromise:Promise<RPCRequestResult> | null = null
            if(this.sseEndpoint && !options.notifications){
                responsePromise = new Promise<RPCRequestResult>((resolve) => {
                    const sseListener = (event:CustomEvent<SseEventDetail>) => {
                        if(event.detail.mcpClientObjectId !== this.mcpClientObjectId) return
                        const data = event.detail.data
                        if(data.id === body.id){
                            document.removeEventListener("mcp-sse", sseListener)
                            resolve({
                                rpc: data,
                                http: {
                                    status: 200,
                                    headers: {}
                                }
                            })
                        }
                    }
                    document.addEventListener("mcp-sse", sseListener)
                })
            }

            const response = await fetchNative(url, requestParams)

            if(this.sseEndpoint && options.notifications){
                return {
                    rpc: {
                        jsonrpc: "2.0",
                        id: body.id,
                        result: null // No result for notifications
                    },
                    http: {
                        status: response.status,
                        headers: Object.fromEntries(response.headers.entries())
                    }
                }
            }

            if(response.status > 299 && responsePromise){
                //invoke error handler
                const details:SseEventDetail = {
                    mcpClientObjectId: this.mcpClientObjectId,
                    data: {
                        jsonrpc: "2.0",
                        id: body.id,
                        error: {
                            code: response.status,
                            message: response.statusText,
                            data: {
                                method: method,
                                params: params
                            }
                        }
                    }
                }

                document.dispatchEvent(new CustomEvent("mcp-sse", {
                    detail: details
                }))
            }


            if(responsePromise){
                return responsePromise
            }
            
            if(
                (this.sessionId && response.status === 404) ||
                (this.accessToken && response.status === 401)
            ){
                this.destroy()
                return this.request(method, params, options)
            }

            const contentType = response.headers.get('Content-Type') || ''
        

            if(contentType.includes('text/event-stream')){

                this.connectSSE(response.body, abortController)


                const v = new Promise<RPCRequestResult>((resolve) => {
                    const sseListener = (event:CustomEvent<SseEventDetail>) => {
                        if(event.detail.mcpClientObjectId !== this.mcpClientObjectId) return
                        const data = event.detail.data
                        if(data.id === body.id){
                            document.removeEventListener("mcp-sse", sseListener)
                            resolve({
                                rpc: data,
                                http: {
                                    status: response.status,
                                    headers: Object.fromEntries(response.headers.entries())
                                }
                            })
                        }
                    }
                    document.addEventListener("mcp-sse", sseListener)
                })
                return v
            }

            if(!contentType.includes('application/json')){
                return {
                    rpc: {
                        jsonrpc: "2.0",
                        id: body.id,
                        error: {
                            code: -32603,
                            message: "Invalid Content-Type",
                            data: {
                                contentType: contentType
                            }
                        }
                    },
                    http: {
                        status: response.status,
                        headers: Object.fromEntries(response.headers.entries())
                    }
                }
            }

            if(response.headers.has('Mcp-Session-Id') && initMethod !== 'none'){
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
                        code: httpStatus,
                        message: "Internal Error"
                    }
                },
                http: {
                    status: httpStatus,
                    headers: {}
                }
            }
        }
    }
    

    async getCapabilities(){
        await this.checkHandshake()
        return this.serverInfo?.capabilities || {}
    }

    
    async loadPrompt(mcpPrompt:MCPPrompt){
        await this.checkHandshake()
        const d = await this.request("prompts/get", {
            name: mcpPrompt.name
        })

        return d
    }

    checkHandshake(){
        if(this.initialized){
            return this.serverInfo
        }
        else{
            return this.handshake()
        }
    }
    
    async handshake(){

        console.log("MCP Handshake", this.url, this.mcpClientObjectId)
        this.protocolVersion = '2025-03-26' //default to latest version
        let {rpc:d,http} = await this.request('initialize', {
            "protocolVersion": this.protocolVersion,
            "capabilities": {},
            "clientInfo": {
                name: "RS-MCP-CLIENT",
                version: "1.0.0"
            }
        }, {
            initMethod: 'init'
        })

        if(http.status === 404){
            console.warn("MCP: Streamed transport not supported, falling back to SSE")
            this.protocolVersion = '2024-11-05'
            
            const headers:Record<string, string> = {
                "Accept": "text/event-stream",
            }

            if(this.sessionId){
                headers['Mcp-Session-Id'] = this.sessionId
            }

            if(this.accessToken){
                headers['Authorization'] = `Bearer ${this.accessToken}`
            }

            const connection = await fetchNative(this.url, {
                method: "GET",
                headers: headers
            })

            if(connection.status !== 200){
                throw new Error(`Failed to connect to MCP server: ${connection.status} ${connection.statusText}`)
            }

            this.connectSSE(connection.body)

            const connectionResult = await (new Promise<RPCRequestResult>((resolve) => {
                const sseListener = (event:CustomEvent<SseEventDetail>) => {
                    if(event.detail.mcpClientObjectId !== this.mcpClientObjectId) return
                    const data = event.detail.data
                    if(data.id === 'connected'){
                        document.removeEventListener("mcp-sse", sseListener)
                        resolve({
                            rpc: data,
                            http: {
                                status: connection.status,
                                headers: Object.fromEntries(connection.headers.entries())
                            }
                        })
                    }
                }
                document.addEventListener("mcp-sse", sseListener)
            }))

            const endpoint = connectionResult.rpc.result.endpoint

            if(!endpoint){
                throw new Error("Failed to get endpoint from MCP server")
            }

            const baseUrl = (new URL(this.url)).origin
            

            this.sseEndpoint = `${baseUrl}${endpoint}`

            let r = await this.request('initialize', {
                "protocolVersion": this.protocolVersion,
                "capabilities": {},
                "clientInfo": {
                    name: "RS-MCP-CLIENT",
                    version: "1.0.0"
                }
            }, {
                initMethod: 'init'
            })

            d = r.rpc
            http = r.http
        }

        if(http.status === 401){
            await this.oauthLogin()
            return this.handshake()
        }

        if(d?.result?.serverInfo){
            this.serverInfo = d.result

            await this.request('notifications/initialized', null, {
                notifications: true
            })
            
            
            if(d?.result?.protocolVersion !== "2025-03-26" && d?.result?.protocolVersion !== "2024-11-05"){
                console.warn("MCP Server is using an unsupported protocol version", d.result.protocolVersion)
            }
            else{
                this.protocolVersion = d.result.protocolVersion
            }

            console.log("MCP Handshake Successful", this.serverInfo, this.mcpClientObjectId)
            this.initialized = true

            return this.serverInfo
        }
        else{
            throw "MCP Handshake Failed"
        }
    }

    async oauthLogin(){

        if(this.getRefreshToken){
            const refreshTokenData = await this.getRefreshToken()
            if(refreshTokenData){
                //get access token using refresh token
                const tokenResponse = await fetchNative(refreshTokenData.tokenUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: (new URLSearchParams({
                        grant_type: "refresh_token",
                        refresh_token: refreshTokenData.refreshToken,
                        client_id: refreshTokenData.clientId,
                        client_secret: refreshTokenData.clientSecret
                    })).toString()
                })
                if(tokenResponse.status !== 200){
                    const tokenData = await tokenResponse.json()
                    this.accessToken = tokenData.access_token
                    return
                }
            }
        }

        const OauthDiscovery = new URL(this.url)
        OauthDiscovery.pathname = "/.well-known/oauth-authorization-server"
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

        const redirectURL = "https://account.sionyw.com/oauthhelper" //Just a placeholder, should be replaced with actual redirect URL

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

        const code_verifier = (v4() + v4()).replace(/-/g, "")
        const sha256 = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code_verifier))
        const code_challenge = Buffer.from(sha256).toString('base64').replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")

        const authUrl = new URL(discoveryURLS.authorization_endpoint)
        authUrl.searchParams.set("client_id", clientData.client_id)
        authUrl.searchParams.set("response_type", "code")
        authUrl.searchParams.set("redirect_uri", redirectURL)
        authUrl.searchParams.set("scope", "")
        authUrl.searchParams.set("state", v4())
        authUrl.searchParams.set("code_challenge", code_challenge)
        authUrl.searchParams.set("code_challenge_method", "S256")

        openURL(authUrl.toString())
        const code = await alertInput("Input Authorization Code")

        const authHelperResponse = await fetchNative("https://account.sionyw.com/oauthhelper/api", {
            method: "POST",
            body: JSON.stringify({
                code: code,
            }),
            headers: {
                "Accept": "application/json"
            }
        })

        const authHelperResponseJson = await authHelperResponse.json()

        if(authHelperResponseJson.success !== true){
            throw new Error("Failed to get authorization code from helper")
        }

        const payload = authHelperResponseJson.payload

        const tokenResponse = await fetchNative(discoveryURLS.token_endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: (new URLSearchParams({
                grant_type: "authorization_code",
                code: payload.code || "",
                redirect_uri: redirectURL,
                client_id: clientData.client_id,
                client_secret: clientData.client_secret,
                code_verifier: code_verifier
            })).toString()
        })

        if(tokenResponse.status !== 200){
            throw new Error("Failed to exchange authorization code for access token")
        }

        const tokenData = await tokenResponse.json()

        if(this.registerRefreshToken){
            this.registerRefreshToken({
                clientId: clientData.client_id,
                clientSecret: clientData.client_secret,
                refreshToken: tokenData.refresh_token,
                tokenUrl: discoveryURLS.token_endpoint
            })
        }
        this.accessToken = tokenData.access_token

    }

    async getPromptList():Promise<MCPPrompt[]>{
        await this.checkHandshake()
        if(!this.serverInfo.capabilities?.prompts){
            return []
        }
        if(this.cached.prompts.length > 0){
            return this.cached.prompts
        }
        let prompts:MCPPrompt[] = []
        let cursor:string|null = null
        while(true){
            const args = {
                cursor: cursor
            } as Record<string, any>

            if(!args.cursor){
                delete args.cursor
            }

            const response = await this.request("prompts/list", args)
            if(response.rpc.result?.prompts){
                prompts.push(...response.rpc.result.prompts)
                if(response.rpc.result.nextCursor){
                    cursor = response.rpc.result.nextCursor
                }
                else{
                    break
                }
            }
            else{
                break
            }
        }

        this.cached.prompts = prompts

        return prompts
    }

    async getToolList():Promise<MCPTool[]>{
        await this.checkHandshake()
        if(!this.serverInfo.capabilities?.tools){
            return []
        }
        if(this.cached.tools.length > 0){
            return this.cached.tools
        }
        let tools:MCPTool[] = []
        let cursor:string|null = null
        while(true){
            const args = {
                cursor: cursor
            } as Record<string, any>

            if(!args.cursor){
                delete args.cursor
            }

            const response = await this.request("tools/list", args)
            console.log("MCP Tools List Response", response)
            if(response.rpc.result?.tools){
                tools.push(...response.rpc.result.tools)
                if(response.rpc.result.nextCursor){
                    cursor = response.rpc.result.nextCursor
                }
                else{
                    break
                }
            }
            else{
                break
            }
        }

        this.cached.tools = tools

        return tools
    }

    async callTool(toolName:string, args:any):Promise<RPCToolCallContent[]>{
        await this.checkHandshake()
        if(!this.serverInfo.capabilities?.tools){
            throw new Error("MCP Server does not support tools")
        }

        const response = await this.request("tools/call", {
            name: toolName,
            arguments: args
        })

        if(response.rpc.error){
            return [{
                type: 'text',
                text: `Error calling ${toolName}: ${JSON.stringify(response.rpc.error)}`
            }]
        } 

        return response.rpc?.result?.content
    }

    destroy(){
        this.initialized = false
        this.sessionId = null
        this.accessToken = null
        this.sseEndpoint = null
        this.sseResponses = {}
        for(const sse of this.sses){
            sse.abortController?.abort()
        }
        this.sseIdDone.clear()
        this.sses = []
        this.onDestroy?.()
    }

    ping(){
        return this.request("ping")
    }
}