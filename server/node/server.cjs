const Koa = require('koa');
const Router = require('@koa/router');
const koaStatic = require('koa-static');
const { bodyParser } = require('@koa/bodyparser');
const compress = require('koa-compress');
const app = new Koa();
const router = new Router();
const path = require('path');
const htmlparser = require('node-html-parser');
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs');
const fs = require('fs/promises');
const crypto = require('crypto');
const { Readable } = require('stream');
app.use(compress());
app.use(koaStatic(path.join(process.cwd(), 'dist'), {index: false}));
app.use(bodyParser({
    formLimit: '50mb',
    jsonLimit: '50mb',
    textLimit: '50mb',
    xmlLimit: '50mb'
}));
app.use(async (ctx, next) => {
    if (!ctx.is("application/octet-stream")) {
        return await next();
    }
    
    const chunks = [];
    let totalLength = 0;
    const maxSize = 50 * 1024 * 1024;
  
    for await (const chunk of ctx.req) {
        totalLength += chunk.length;
        
        if (totalLength > maxSize) {
            ctx.status = 413;
            ctx.body = { error: 'Request entity too large.' };
            return;
        }
        
        chunks.push(chunk);
    }
  
    ctx.request.body = Buffer.concat(chunks);
    ctx.request.rawBody = ctx.request.body;
    return await next();
});
const https = require('https');
const sslPath = path.join(process.cwd(), 'server/node/ssl/certificate');
const hubURL = 'https://sv.risuai.xyz'; 

let password = ''

const savePath = path.join(process.cwd(), 'save')
if(!existsSync(savePath)){
    mkdirSync(savePath)
}

const passwordPath = path.join(savePath, '__password')
if(existsSync(passwordPath)){
    password = readFileSync(passwordPath, 'utf-8')
}
const hexRegex = /^[\da-f]+$/i;
function isHex(str) {
    return hexRegex.test(str.toUpperCase().trim()) || str === '__password';
}

router.get('/', async (ctx, next) => {
    const clientIP = ctx.headers['x-forwarded-for'] || ctx.ip || ctx.socket.remoteAddress || 'Unknown IP';
    const timestamp = new Date().toISOString();
    console.log(`[Server] ${timestamp} | Connection from: ${clientIP}`);
    
    try {
        const mainIndex = await fs.readFile(path.join(process.cwd(), 'dist', 'index.html'))
        const root = htmlparser.parse(mainIndex)
        const head = root.querySelector('head')
        head.innerHTML = `<script>globalThis.__NODE__ = true</script>` + head.innerHTML
        
        ctx.body = root.toString()
    } catch (error) {
        console.log(error)
        throw error
    }
})

const reverseProxyFunc = async (ctx, next) => {
    const authHeader = ctx.headers['risu-auth'];
    if(!authHeader || authHeader.trim() !== password.trim()){
        console.log('incorrect', 'received:', authHeader, 'expected:', password)
        ctx.status = 400;
        ctx.body = {
            error:'Password Incorrect'
        };
        return
    }
    
    const urlParam = ctx.headers['risu-url'] ? decodeURIComponent(ctx.headers['risu-url']) : ctx.query.url;

    if (!urlParam) {
        ctx.status = 400;
        ctx.body = {
            error:'URL has no param'
        };
        return;
    }
    const header = ctx.headers['risu-header'] ? JSON.parse(decodeURIComponent(ctx.headers['risu-header'])) : ctx.headers;
    header['x-forwarded-for'] ??= ctx.ip;
    let originalResponse;
    try {
        // make request to original server
        originalResponse = await fetch(urlParam, {
            method: ctx.method,
            headers: header,
            body: JSON.stringify(ctx.request.body)
        });
        // get response headers
        const head = new Headers(originalResponse.headers);
        head.delete('content-security-policy');
        head.delete('content-security-policy-report-only');
        head.delete('clear-site-data');
        head.delete('Cache-Control');
        head.delete('Content-Encoding');
        const headObj = {};
        for (let [k, v] of head) {
            headObj[k] = v;
        }
        // send response headers to client
        ctx.set(headObj);
        // send response status to client
        ctx.status = originalResponse.status;
        // send response body to client
        ctx.body = Readable.fromWeb(originalResponse.body);
    }
    catch (err) {
        throw err;
    }
}

const reverseProxyFunc_get = async (ctx, next) => {
    const authHeader = ctx.headers['risu-auth'];
    if(!authHeader || authHeader.trim() !== password.trim()){
        console.log('incorrect', 'received:', authHeader, 'expected:', password)
        ctx.status = 400;
        ctx.body = {
            error:'Password Incorrect'
        };
        return
    }
    
    const urlParam = ctx.headers['risu-url'] ? decodeURIComponent(ctx.headers['risu-url']) : ctx.query.url;

    if (!urlParam) {
        ctx.status = 400;
        ctx.body = {
            error:'URL has no param'
        };
        return;
    }
    const header = ctx.headers['risu-header'] ? JSON.parse(decodeURIComponent(ctx.headers['risu-header'])) : ctx.headers;
    header['x-forwarded-for'] ??= ctx.ip;
    let originalResponse;
    try {
        // make request to original server
        originalResponse = await fetch(urlParam, {
            method: 'GET',
            headers: header
        });
        // get response headers
        const head = new Headers(originalResponse.headers);
        head.delete('content-security-policy');
        head.delete('content-security-policy-report-only');
        head.delete('clear-site-data');
        head.delete('Cache-Control');
        head.delete('Content-Encoding');
        const headObj = {};
        for (let [k, v] of head) {
            headObj[k] = v;
        }
        // send response headers to client
        ctx.set(headObj);
        // send response status to client
        ctx.status = originalResponse.status;
        // send response body to client
        ctx.body = Readable.fromWeb(originalResponse.body);
    }
    catch (err) {
        throw err;
    }
}

async function hubProxyFunc(ctx) {

    try {
        const pathAndQuery = ctx.originalUrl.replace(/^\/hub-proxy/, '');
        const externalURL = hubURL + pathAndQuery;
        
        const headersToSend = { ...ctx.headers };
        delete headersToSend.host;
        delete headersToSend.connection;
        
        const response = await fetch(externalURL, {
            method: ctx.method,
            headers: headersToSend,
            body: ctx.method !== 'GET' && ctx.method !== 'HEAD' ? ctx.req : undefined,
            redirect: 'manual',
            duplex: 'half'
        });
        
        for (const [key, value] of response.headers.entries()) {
            ctx.set(key, value);
        }
        ctx.status = response.status;
        
        if (response.status >= 300 && response.status < 400) {
            // Redirect handling (due to ‘/redirect/docs/lua’)
            const redirectUrl = response.headers.get('location');
            if (redirectUrl) {
                
                if (redirectUrl.startsWith('http')) {
                    
                    if (redirectUrl.startsWith(hubURL)) {
                        const newPath = redirectUrl.replace(hubURL, '/hub-proxy');
                        ctx.set('location', newPath);
                    }
                    
                } else if (redirectUrl.startsWith('/')) {
                    
                    ctx.set('location', `/hub-proxy${redirectUrl}`);
                }
            }

            return;
        }
        
        ctx.body = Readable.fromWeb(response.body);
        
    } catch (error) {
        console.error("[Hub Proxy] Error:", error);
        ctx.status = 502;
        ctx.body = { error: 'Proxy request failed: ' + error.message };
    }
}

router.get('/proxy', reverseProxyFunc_get);
router.get('/proxy2', reverseProxyFunc_get);
router.get('/hub-proxy/(.*)', hubProxyFunc);

router.post('/proxy', reverseProxyFunc);
router.post('/proxy2', reverseProxyFunc);
router.post('/hub-proxy/(.*)', hubProxyFunc);

router.get('/api/password', async(ctx)=> {
    if(password === ''){
        ctx.body = {status: 'unset'}
    }
    else if(ctx.headers['risu-auth']  === password){
        ctx.body = {status:'correct'}
    }
    else{
        ctx.body = {status:'incorrect'}
    }
})

router.post('/api/crypto', async (ctx) => {
    try {
        const hash = crypto.createHash('sha256')
        hash.update(Buffer.from(ctx.request.body.data, 'utf-8'))
        ctx.body = hash.digest('hex')
    } catch (error) {
        throw error
    }
})


router.post('/api/set_password', async (ctx) => {
    if(password === ''){
        password = ctx.request.body.password
        writeFileSync(passwordPath, password, 'utf-8')
    }
    ctx.status = 400;
    ctx.body = "already set"
})

router.get('/api/read', async (ctx, next) => {
    if(ctx.headers['risu-auth'].trim() !== password.trim()){
        console.log('incorrect')
        ctx.status = 400;
        ctx.body = {
            error:'Password Incorrect'
        };
        return
    }
    const filePath = ctx.headers['file-path'] || ctx.get('file-path');
    if (!filePath) {
        console.log('no path')
        ctx.status = 400;
        ctx.body = {
            error:'File path required'
        };
        return;
    }

    if(!isHex(filePath)){
        ctx.status = 400;
        ctx.body = {
            error:'Invaild Path'
        };
        return;
    }
    try {
        if(!existsSync(path.join(savePath, filePath))){
            ctx.body = null;
        }
        else{
            ctx.set('Content-Type','application/octet-stream');
            ctx.body = await fs.readFile(path.join(savePath, filePath));
        }
    } catch (error) {
        throw error;
    }
});

router.get('/api/remove', async (ctx, next) => {
    if(ctx.headers['risu-auth'].trim() !== password.trim()){
        console.log('incorrect')
        ctx.status = 400;
        ctx.body = {
            error:'Password Incorrect'
        };
        return
    }
    const filePath = ctx.headers['file-path'] || ctx.get('file-path');
    if (!filePath) {
        ctx.status = 400;
        ctx.body = {
            error:'File path required'
        };
        return;
    }
    if(!isHex(filePath)){
        ctx.status = 400;
        ctx.body = {
            error:'Invaild Path'
        };
        return;
    }

    try {
        await fs.rm(path.join(savePath, filePath));
        ctx.body = {
            success: true,
        };
    } catch (error) {
        throw error;
    }
});

router.get('/api/list', async (ctx, next) => {
    if(ctx.headers['risu-auth'].trim() !== password.trim()){
        console.log('incorrect')
        ctx.status = 400;
        ctx.body = {
            error:'Password Incorrect'
        };
        return
    }
    try {
        const data = (await fs.readdir(path.join(savePath))).map((v) => {
            return Buffer.from(v, 'hex').toString('utf-8')
        })
        ctx.body = {
            success: true,
            content: data
        };
    } catch (error) {
        throw error;
    }
});

router.post('/api/write', async (ctx, next) => {
    if(ctx.headers['risu-auth'].trim() !== password.trim()){
        console.log('incorrect')
        ctx.status = 400;
        ctx.body = {
            error:'Password Incorrect'
        };
        return
    }
    const filePath = ctx.headers['file-path'];
    const fileContent = ctx.request.body;
    if (!filePath || !fileContent) {
        ctx.status = 400;
        ctx.body = {
            error:'File path required'
        };
        return;
    }
    if(!isHex(filePath)){
        ctx.status = 400;
        ctx.body = {
            error:'Invaild Path'
        };
        return;
    }

    try {
        await fs.writeFile(path.join(savePath, filePath), fileContent);
        ctx.body = {
            success: true
        };
    } catch (error) {
        throw error;
    }
});

app.use(router.routes()).use(router.allowedMethods());

async function getHttpsOptions() {

    const keyPath = path.join(sslPath, 'server.key');
    const certPath = path.join(sslPath, 'server.crt');

    try {
 
        await fs.access(keyPath);
        await fs.access(certPath);

        const [key, cert] = await Promise.all([
            fs.readFile(keyPath),
            fs.readFile(certPath)
        ]);
       
        return { key, cert };

    } catch (error) {
        console.error('[Server] SSL setup errors:', error.message);
        console.log('[Server] Start the server with HTTP instead of HTTPS...');
        return null;
    }
}

async function startServer() {
    try {
      
        const port = process.env.PORT || 6001;
        const httpsOptions = await getHttpsOptions();

        if (httpsOptions) {
            // HTTPS
            https.createServer(httpsOptions, app.callback()).listen(port, () => {
                console.log("[Server] HTTPS server is running.");
                console.log(`[Server] https://localhost:${port}/`);
            });
        } else {
            // HTTP
            app.listen(port, () => {
                console.log("[Server] HTTP server is running.");
                console.log(`[Server] http://localhost:${port}/`);
            });
        }
    } catch (error) {
        console.error('[Server] Failed to start server :', error);
        process.exit(1);
    }
}

(async () => {
    await startServer();
})();
