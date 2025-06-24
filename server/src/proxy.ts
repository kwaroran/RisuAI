import { Router, type RequestHandler } from "express";
import { pipeline } from "stream/promises"
import * as config from "./config.ts"

const routerInternal = Router();
routerInternal.post("/", async (req, res, next) => {
    const urlParam: string | undefined = req.headers['risu-url'] ?
        decodeURIComponent(req.headers['risu-url'] as string) :
        req.query.url as string;

    if (!urlParam) {
        res.status(400).send({
            error: 'URL has no param'
        });
        return;
    }

    const header: Record<string, string> = req.headers['risu-header'] ?
        JSON.parse(decodeURIComponent(req.headers['risu-header'] as string)) :
        req.headers;
    if (!header['x-forwarded-for'] && req.ip) {
        header['x-forwarded-for'] = req.ip
    }
    try {
        // make request to original server
        const originalResponse = await fetch(urlParam, {
            method: req.method,
            headers: header,
            body: JSON.stringify(req.body)
        });
        // get response headers
        const head = new Headers(originalResponse.headers);
        head.delete('content-security-policy');
        head.delete('content-security-policy-report-only');
        head.delete('clear-site-data');
        head.delete('Cache-Control');
        head.delete('Content-Encoding');
        const headObj = Object(head.entries())
        for (let [k, v] of head) {
            headObj[k] = v;
        }
        // send response headers to client
        res.header(headObj);
        // send response status to client
        res.status(originalResponse.status);

        // send response body to client
        // @ts-ignore
        await pipeline(originalResponse.body, res);


    }
    catch (err) {
        next(err);
        return;
    }
});

routerInternal.get("/", async (req, res, next) => {
    const urlParam: string | undefined = req.headers['risu-url'] ?
        decodeURIComponent(req.headers['risu-url'] as string) :
        req.query.url as string;

    if (!urlParam) {
        res.status(400).send({
            error: 'URL has no param'
        });
        return;
    }

    const header: Record<string, string> = req.headers['risu-header'] ?
        JSON.parse(decodeURIComponent(req.headers['risu-header'] as string)) :
        req.headers;
    if (!header['x-forwarded-for'] && req.ip) {
        header['x-forwarded-for'] = req.ip
    }
    try {
        // make request to original server
        const originalResponse = await fetch(urlParam, {
            method: req.method,
            headers: header,
        });
        // get response headers
        const head = new Headers(originalResponse.headers);
        head.delete('content-security-policy');
        head.delete('content-security-policy-report-only');
        head.delete('clear-site-data');
        head.delete('Cache-Control');
        head.delete('Content-Encoding');
        const headObj = Object(head.entries())
        for (let [k, v] of head) {
            headObj[k] = v;
        }
        // send response headers to client
        res.header(headObj);
        // send response status to client
        res.status(originalResponse.status);

        // send response body to client
        // @ts-ignore
        await pipeline(originalResponse.body, res);
    }
    catch (err) {
        next(err);
        return;
    }
});

const router = Router()
router.use('/proxy', routerInternal);
router.use('/proxy2', routerInternal);
const hubProxy: RequestHandler = async (req, res) => {
    try {
        const pathAndQuery = req.originalUrl.replace(/^\/hub-proxy/, '');
        const externalURL = config.hubURL + pathAndQuery;

        const headersToSend = { ...req.headers };
        delete headersToSend.host;
        delete headersToSend.connection;

        //@ts-ignore
        const response = await fetch(externalURL,
            {
                method: req.method,
                headers: headersToSend,
                body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
                redirect: 'manual'
            });

        for (const [key, value] of response.headers.entries()) {
            res.setHeader(key, value);
        }
        res.status(response.status);

        if (response.status >= 300 && response.status < 400) {
            // Redirect handling (due to ‘/redirect/docs/lua’)
            const redirectUrl = response.headers.get('location');
            if (redirectUrl) {

                if (redirectUrl.startsWith('http')) {

                    if (redirectUrl.startsWith(config.hubURL)) {
                        const newPath = redirectUrl.replace(config.hubURL, '/hub-proxy');
                        res.setHeader('location', newPath);
                    }

                } else if (redirectUrl.startsWith('/')) {
                    res.setHeader('location', `/hub-proxy${redirectUrl}`);
                }
            }
            res.end();
            return;
        }
        //@ts-ignore
        await pipeline(response.body, res);

    } catch (error: any) {
        console.error("[Hub Proxy] Error:", error);
        if (!res.headersSent) {
            res.status(502).send({ error: 'Proxy request failed: ' + error.message });
        } else {
            res.end();
        }
    }
};
router.get("/hub-proxy/*", hubProxy)
router.post("/hub-proxy/*", hubProxy)
export default router