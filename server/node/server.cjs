const express = require('express');
const app = express();
const path = require('path');
const htmlparser = require('node-html-parser');
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs');
const fs = require('fs/promises')
const crypto = require('crypto')
app.use(express.static(path.join(process.cwd(), 'dist'), {index: false}));
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));
const {pipeline} = require('stream/promises')
const https = require('https');
const sslPath = path.join(process.cwd(), 'server/node/ssl/certificate');
const EXTERNAL_HUB_URL = 'https://sv.risuai.xyz'; 
const fetch = require('node-fetch');

let password = ''

const savePath = path.join(process.cwd(), "save")
if(!existsSync(savePath)){
    mkdirSync(savePath)
}

const passwordPath = path.join(process.cwd(), 'save', '__password')
if(existsSync(passwordPath)){
    password = readFileSync(passwordPath, 'utf-8')
}
const hexRegex = /^[0-9a-fA-F]+$/;
function isHex(str) {
    return hexRegex.test(str.toUpperCase().trim()) || str === '__password';
}

app.get('/', async (req, res, next) => {
    console.log("[Server] Connected")
    try {
        const mainIndex = await fs.readFile(path.join(process.cwd(), 'dist', 'index.html'))
        const root = htmlparser.parse(mainIndex)
        const head = root.querySelector('head')
        head.innerHTML = `<script>globalThis.__NODE__ = true</script>` + head.innerHTML
        res.send(root.toString())
    } catch (error) {
        console.log(error)
        next(error)
    }
})

const reverseProxyFunc = async (req, res, next) => {
    const urlParam = req.headers['risu-url'] ? decodeURIComponent(req.headers['risu-url']) : req.query.url;

    if (!urlParam) {
        res.status(400).send({
            error:'URL has no param'
        });
        return;
    }
    const header = req.headers['risu-header'] ? JSON.parse(decodeURIComponent(req.headers['risu-header'])) : req.headers;
    if(!header['x-forwarded-for']){
        header['x-forwarded-for'] = req.ip
    }
    let originalResponse;
    try {
        // make request to original server
        originalResponse = await fetch(urlParam, {
            method: req.method,
            headers: header,
            body: JSON.stringify(req.body)
        });
        // get response body as stream
        const originalBody = originalResponse.body;
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
        res.header(headObj);
        // send response status to client
        res.status(originalResponse.status);
        // send response body to client
        await pipeline(originalResponse.body, res);


    }
    catch (err) {
        next(err);
        return;
    }
}

const reverseProxyFunc_get = async (req, res, next) => {
    const urlParam = req.headers['risu-url'] ? decodeURIComponent(req.headers['risu-url']) : req.query.url;

    if (!urlParam) {
        res.status(400).send({
            error:'URL has no param'
        });
        return;
    }
    const header = req.headers['risu-header'] ? JSON.parse(decodeURIComponent(req.headers['risu-header'])) : req.headers;
    if(!header['x-forwarded-for']){
        header['x-forwarded-for'] = req.ip
    }
    let originalResponse;
    try {
        // make request to original server
        originalResponse = await fetch(urlParam, {
            method: 'GET',
            headers: header
        });
        // get response body as stream
        const originalBody = originalResponse.body;
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
        res.header(headObj);
        // send response status to client
        res.status(originalResponse.status);
        // send response body to client
        await pipeline(originalResponse.body, res);
    }
    catch (err) {
        next(err);
        return;
    }
}

// Risu Realm Proxy
async function hubProxyHandler(req, res, next) {
    try {
        // Extract request path and query parameters
        const pathAndQuery = req.originalUrl.replace(/^\/hub-proxy/, '');
        const externalURL = EXTERNAL_HUB_URL + pathAndQuery;

        console.log(`[Hub Proxy] Forwarding ${req.method} request to: ${externalURL}`);

        // Prepare headers to send to the realm server (including Accept-Encoding modification)
        const headersToSend = { ...req.headers };
        delete headersToSend['host'];
        delete headersToSend['connection'];
        headersToSend['accept-encoding'] = 'gzip, deflate'; // Exclude zstd, etc.
        if (!headersToSend['x-forwarded-for']) {
            headersToSend['x-forwarded-for'] = req.ip;
        }

        // Execute the fetch request to the realm server
        const response = await fetch(externalURL, {
            method: req.method,
            headers: headersToSend,
            body: (req.method !== 'GET' && req.method !== 'HEAD') ? req.body : undefined,
        });

        console.log(`[Hub Proxy] Received status ${response.status} from external server`);

        // Handle the realm server response
        // Clean up response headers and extract Content-Type
        const responseHeaders = {};
        // Check the Content-Type of the realm server response (use default if missing)
        let contentType = response.headers.get('content-type') || 'application/octet-stream';

        response.headers.forEach((value, key) => {
            const lowerKey = key.toLowerCase();
            // List of headers not to be forwarded to the client
            const excludedHeaders = [
                'transfer-encoding', 'connection', 'content-encoding',
                'access-control-allow-origin', 'access-control-allow-methods',
                'access-control-allow-headers', 'content-security-policy',
                'content-security-policy-report-only', 'clear-site-data',
                'strict-transport-security', 'expect-ct',
                'cf-ray', 'cf-cache-status', 'report-to', 'nel', 'server', 'server-timing', 'alt-svc'
            ];
            if (!excludedHeaders.includes(lowerKey)) {
                responseHeaders[key] = value;
            }
        });

        // Set the status code and cleaned headers for the client
        res.status(response.status).set(responseHeaders);

        // Determine body processing method based on Content-Type
        try {
            if (contentType.startsWith('application/json')) {
                // JSON response: read as text and send
                const bodyText = await response.text();
                console.log(`[Hub Proxy] Processing JSON response (size: ${bodyText.length})`);
                res.setHeader('Content-Type', contentType); // Set the final Content-Type
                res.send(bodyText);

            } else if (contentType.startsWith('image/')) {
                // Image response: read as buffer and send
                const bodyBuffer = await response.buffer(); // Assuming 'fetch' response object has a .buffer() method or similar
                console.log(`[Hub Proxy] Processing Image response (type: ${contentType}, size: ${bodyBuffer.length} bytes)`);
                res.setHeader('Content-Type', contentType); // Set the final Content-Type
                res.send(bodyBuffer);

            } else {
                // Other responses (HTML, other text, unknown binary, etc.): read as buffer and send safely
                const bodyBuffer = await response.buffer(); // Assuming 'fetch' response object has a .buffer() method or similar
                console.log(`[Hub Proxy] Processing Other response as buffer (type: ${contentType}, size: ${bodyBuffer.length} bytes)`);
                // Use original Content-Type if available, otherwise use octet-stream (already handled by default assignment)
                res.setHeader('Content-Type', contentType);
                res.send(bodyBuffer);
            }
        } catch (bodyError) {
            // If an error occurs while reading/processing the response body
            console.error("[Hub Proxy] Error reading/processing response body:", bodyError);
            if (!res.headersSent) {
                res.status(500).send({ error: 'Failed to process response body from hub server.' });
            } else {
                console.error("[Hub Proxy] Headers already sent, cannot send body error to client.");
                res.end();
            }
            return; // End the handler
        }

    } catch (error) {
        // Fetch request itself failed or other exceptions
        console.error("[Hub Proxy] Request failed:", error);
        if (!res.headersSent) {
            res.status(502).send({ error: 'Proxy failed to connect to or get response from the hub server.' });
        } else {
            console.error("[Hub Proxy] Headers already sent, cannot send connection error to client.");
            res.end();
        }
    }
}

app.get('/hub-proxy/*', hubProxyHandler);
app.post('/hub-proxy/*', hubProxyHandler);
app.put('/hub-proxy/*', hubProxyHandler);

app.get('/proxy', reverseProxyFunc_get);
app.get('/proxy2', reverseProxyFunc_get);

app.post('/proxy', reverseProxyFunc);
app.post('/proxy2', reverseProxyFunc);


app.get('/api/password', async(req, res)=> {
    if(password === ''){
        res.send({status: 'unset'})
    }
    else if(req.headers['risu-auth']  === password){
        res.send({status:'correct'})
    }
    else{
        res.send({status:'incorrect'})
    }
})

app.post('/api/crypto', async (req, res) => {
    try {
        const hash = crypto.createHash('sha256')
        hash.update(Buffer.from(req.body.data, 'utf-8'))
        res.send(hash.digest('hex'))
    } catch (error) {
        next(error)
    }
})


app.post('/api/set_password', async (req, res) => {
    if(password === ''){
        password = req.body.password
        writeFileSync(passwordPath, password, 'utf-8')
    }
    res.status(400).send("already set")
})

app.get('/api/read', async (req, res, next) => {
    if(req.headers['risu-auth'].trim() !== password.trim()){
        console.log('incorrect')
        res.status(400).send({
            error:'Password Incorrect'
        });
        return
    }
    const filePath = req.headers['file-path'];
    if (!filePath) {
        console.log('no path')
        res.status(400).send({
            error:'File path required'
        });
        return;
    }

    if(!isHex(filePath)){
        res.status(400).send({
            error:'Invaild Path'
        });
        return;
    }
    try {
        if(!existsSync(path.join(savePath, filePath))){
            res.send();
        }
        else{
            res.setHeader('Content-Type','application/octet-stream');
            res.sendFile(path.join(savePath, filePath));
        }
    } catch (error) {
        next(error);
    }
});

app.get('/api/remove', async (req, res, next) => {
    if(req.headers['risu-auth'].trim() !== password.trim()){
        console.log('incorrect')
        res.status(400).send({
            error:'Password Incorrect'
        });
        return
    }
    const filePath = req.headers['file-path'];
    if (!filePath) {
        res.status(400).send({
            error:'File path required'
        });
        return;
    }
    if(!isHex(filePath)){
        res.status(400).send({
            error:'Invaild Path'
        });
        return;
    }

    try {
        await fs.rm(path.join(savePath, filePath));
        res.send({
            success: true,
        });
    } catch (error) {
        next(error);
    }
});

app.get('/api/list', async (req, res, next) => {
    if(req.headers['risu-auth'].trim() !== password.trim()){
        console.log('incorrect')
        res.status(400).send({
            error:'Password Incorrect'
        });
        return
    }
    try {
        const data = (await fs.readdir(path.join(savePath))).map((v) => {
            return Buffer.from(v, 'hex').toString('utf-8')
        })
        res.send({
            success: true,
            content: data
        });
    } catch (error) {
        next(error);
    }
});

app.post('/api/write', async (req, res, next) => {
    if(req.headers['risu-auth'].trim() !== password.trim()){
        console.log('incorrect')
        res.status(400).send({
            error:'Password Incorrect'
        });
        return
    }
    const filePath = req.headers['file-path'];
    const fileContent = req.body
    if (!filePath || !fileContent) {
        res.status(400).send({
            error:'File path required'
        });
        return;
    }
    if(!isHex(filePath)){
        res.status(400).send({
            error:'Invaild Path'
        });
        return;
    }

    try {
        await fs.writeFile(path.join(savePath, filePath), fileContent);
        res.send({
            success: true
        });
    } catch (error) {
        next(error);
    }
});

async function getHttpsOptions() {

    const keyPath = path.join(sslPath, 'server.key');
    const certPath = path.join(sslPath, 'server.crt');

    console.log(keyPath)
    console.log(certPath)

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
            https.createServer(httpsOptions, app).listen(port, () => {
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
