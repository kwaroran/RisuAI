import app from './app/index.js'

const checkCloudflareWorkers = () => {
    try {
        return navigator && navigator.userAgent && navigator.userAgent.includes('Cloudflare-Workers')
    } catch {
        return false
    }
}

const checkVercelEdge = () => {
    try {
        //@ts-expect-error Vercel Edge global check
        return typeof WebSocketPair !== 'undefined' && typeof process !== 'undefined' && typeof process.env !== 'undefined' && typeof process.env.VERCEL_REGION !== 'undefined'
    } catch {
        return false
    }
}

const checkBun = () => {
    try {
        //@ts-expect-error Bun global check
        return typeof Bun !== 'undefined'
    } catch {
        return false
    }
}

const checkNode = () => {
    try {
        //No ts-expect-error Node.js global check
        return typeof (typeof process !== 'undefined') && (typeof process.versions.node !== 'undefined') && !checkBun()
    } catch {
        return false
    }
}

const IS_CLOUDFLARE_WORKERS = checkCloudflareWorkers()
const IS_VERCEL_EDGE = checkVercelEdge()
const IS_BUN = checkBun()
const IS_NODE = checkNode()

let detectedRuntime = ''
if(IS_CLOUDFLARE_WORKERS){
    detectedRuntime = 'Cloudflare Workers'
}
else if(IS_VERCEL_EDGE){
    detectedRuntime = 'Vercel Edge Functions'
}
else if(IS_BUN){
    detectedRuntime = 'Bun'
}
else if(IS_NODE){
    detectedRuntime = 'Node.js'
}
else{
    detectedRuntime = 'Unknown'
}

if(IS_CLOUDFLARE_WORKERS || IS_VERCEL_EDGE || IS_BUN){
    //continue
}
else if(IS_NODE){
    throw new Error('To run the Hono Risuai server in Node.js, please use the command: npm run start:node to execute app/node.ts which starts the server using @hono/node-server.')
}
else{
    throw new Error('Unsupported runtime environment for Hono Risuai server.')
}

console.log(`Hono Risuai server is running on ${detectedRuntime} environment.`)
export default app