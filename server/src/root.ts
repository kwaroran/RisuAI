import { Router } from "express";
import htmlparser from "node-html-parser"
import * as config from "./config.ts"
import path from "node:path";
import { readFile } from "node:fs/promises";

const router = Router();


let _indexHtmlCache: string | null = null
async function indexHtml() {
    if (typeof _indexHtmlCache === "string")
        return _indexHtmlCache;
    const mainIndex = await readFile(path.join(config.distDir, 'index.html'), { encoding: "utf-8" })
    const root = htmlparser.parse(mainIndex)
    const head = root.querySelector('head')!!
    head.innerHTML = `<script>globalThis.__NODE__ = true</script>` + head.innerHTML
    _indexHtmlCache = root.toString()
    return _indexHtmlCache
}

router.get('/', async (req, res, next) => {

    const clientIP = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'Unknown IP';
    const timestamp = new Date().toISOString();
    console.log(`[Server] ${timestamp} | Connection from: ${clientIP}`);

    try {
        res.send(await indexHtml())
    } catch (error) {
        console.log(error)
        next(error)
    }
})


export default router;