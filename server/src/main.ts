import express from "express"
import * as config from "./config.ts"
import root from "./root.ts";
import password from "./password.ts"
import proxy from "./proxy.ts"
import crud from "./crud.ts"
import https from "https"
import fs from "fs/promises";
const app = express()

app.use(express.static(config.distDir, { index: false }));
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

app.use("/", root)
app.use("/api", password)
app.use("/", proxy)
app.use("/api", crud)


async function getHttpsOptions() {
    try {
        //todo legacy behaviour
        await fs.access(config.keyPath);
        await fs.access(config.certPath);

        const [key, cert] = await Promise.all([
            fs.readFile(config.keyPath),
            fs.readFile(config.certPath)
        ]);

        return { key, cert };

    } catch (error: any) {
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


await startServer();
