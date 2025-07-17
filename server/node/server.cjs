const express = require("express");
const app = express();
const path = require("path");
const htmlparser = require("node-html-parser");
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("fs");
const fs = require("fs/promises");
const crypto = require("crypto");
app.use(express.static(path.join(process.cwd(), "dist"), { index: false }));
app.get("/hub-proxy/*", hubProxyFunc_get);
app.post(
  "/hub-proxy/*",
  express.raw({ type: "*/*", limit: "50mb" }),
  hubProxyFunc
);
app.put(
  "/hub-proxy/*",
  express.raw({ type: "*/*", limit: "50mb" }),
  hubProxyFunc
);
app.delete(
  "/hub-proxy/*",
  express.raw({ type: "*/*", limit: "50mb" }),
  hubProxyFunc
);

app.use(express.json({ limit: "50mb" }));
app.use(express.raw({ type: "application/octet-stream", limit: "50mb" }));
const { pipeline } = require("stream/promises");
const https = require("https");
const sslPath = path.join(process.cwd(), "server/node/ssl/certificate");
const hubURL = "https://sv.risuai.xyz";

let password = "";

const savePath = path.join(process.cwd(), "save");
if (!existsSync(savePath)) {
  mkdirSync(savePath);
}

const passwordPath = path.join(process.cwd(), "save", "__password");
if (existsSync(passwordPath)) {
  password = readFileSync(passwordPath, "utf-8");
}
const hexRegex = /^[0-9a-fA-F]+$/;
function isHex(str) {
  return hexRegex.test(str.toUpperCase().trim()) || str === "__password";
}

app.get("/", async (req, res, next) => {
  const clientIP =
    req.headers["x-forwarded-for"] ||
    req.ip ||
    req.socket.remoteAddress ||
    "Unknown IP";
  const timestamp = new Date().toISOString();
  console.log(`[Server] ${timestamp} | Connection from: ${clientIP}`);

  try {
    const mainIndex = await fs.readFile(
      path.join(process.cwd(), "dist", "index.html")
    );
    const root = htmlparser.parse(mainIndex);
    const head = root.querySelector("head");
    head.innerHTML =
      `<script>globalThis.__NODE__ = true</script>` + head.innerHTML;

    res.send(root.toString());
  } catch (error) {
    console.log(error);
    next(error);
  }
});

const reverseProxyFunc = async (req, res, next) => {
  const authHeader = req.headers["risu-auth"];
  if (!authHeader || authHeader.trim() !== password.trim()) {
    console.log("incorrect", "received:", authHeader, "expected:", password);
    res.status(400).send({
      error: "Password Incorrect",
    });
    return;
  }

  const urlParam = req.headers["risu-url"]
    ? decodeURIComponent(req.headers["risu-url"])
    : req.query.url;

  if (!urlParam) {
    res.status(400).send({
      error: "URL has no param",
    });
    return;
  }
  const header = req.headers["risu-header"]
    ? JSON.parse(decodeURIComponent(req.headers["risu-header"]))
    : req.headers;
  if (!header["x-forwarded-for"]) {
    header["x-forwarded-for"] = req.ip;
  }
  let originalResponse;
  try {
    originalResponse = await fetch(urlParam, {
      method: req.method,
      headers: header,
      body: JSON.stringify(req.body),
    });
    const originalBody = originalResponse.body;
    const head = new Headers(originalResponse.headers);
    head.delete("content-security-policy");
    head.delete("content-security-policy-report-only");
    head.delete("clear-site-data");
    head.delete("Cache-Control");
    head.delete("Content-Encoding");
    const headObj = {};
    for (let [k, v] of head) {
      headObj[k] = v;
    }
    res.header(headObj);
    res.status(originalResponse.status);
    await pipeline(originalResponse.body, res);
  } catch (err) {
    next(err);
    return;
  }
};

const reverseProxyFunc_get = async (req, res, next) => {
  const authHeader = req.headers["risu-auth"];
  if (!authHeader || authHeader.trim() !== password.trim()) {
    console.log("incorrect", "received:", authHeader, "expected:", password);
    res.status(400).send({
      error: "Password Incorrect",
    });
    return;
  }

  const urlParam = req.headers["risu-url"]
    ? decodeURIComponent(req.headers["risu-url"])
    : req.query.url;

  if (!urlParam) {
    res.status(400).send({
      error: "URL has no param",
    });
    return;
  }
  const header = req.headers["risu-header"]
    ? JSON.parse(decodeURIComponent(req.headers["risu-header"]))
    : req.headers;
  if (!header["x-forwarded-for"]) {
    header["x-forwarded-for"] = req.ip;
  }
  let originalResponse;
  try {
    originalResponse = await fetch(urlParam, {
      method: "GET",
      headers: header,
    });
    const originalBody = originalResponse.body;
    const head = new Headers(originalResponse.headers);
    head.delete("content-security-policy");
    head.delete("content-security-policy-report-only");
    head.delete("clear-site-data");
    head.delete("Cache-Control");
    head.delete("Content-Encoding");
    const headObj = {};
    for (let [k, v] of head) {
      headObj[k] = v;
    }
    res.header(headObj);
    res.status(originalResponse.status);
    await pipeline(originalResponse.body, res);
  } catch (err) {
    next(err);
    return;
  }
};

async function hubProxyFunc(req, res, next) {
  try {
    const pathAndQuery = req.originalUrl.replace(/^\/hub-proxy/, "");
    const externalURL = hubURL + pathAndQuery;

    const headersToSend = { ...req.headers };
    delete headersToSend.host;
    delete headersToSend.connection;

    const response = await fetch(externalURL, {
      method: req.method,
      headers: headersToSend,
      body: req.body,
      redirect: "manual",
      duplex: "half",
      compress: false,
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("Content-Encoding");
    responseHeaders.delete("content-security-policy");
    responseHeaders.delete("content-security-policy-report-only");
    responseHeaders.delete("clear-site-data");

    for (const [key, value] of responseHeaders.entries()) {
      res.setHeader(key, value);
    }

    res.status(response.status);

    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.get("location");
      if (redirectUrl) {
        if (redirectUrl.startsWith("http")) {
          if (redirectUrl.startsWith(hubURL)) {
            const newPath = redirectUrl.replace(hubURL, "/hub-proxy");
            res.setHeader("location", newPath);
          }
        } else if (redirectUrl.startsWith("/")) {
          res.setHeader("location", `/hub-proxy${redirectUrl}`);
        }
      }

      return res.end();
    }

    await pipeline(response.body, res);
  } catch (error) {
    console.error("[Hub Proxy] Error:", error);
    if (!res.headersSent) {
      res.status(502).send({ error: "Proxy request failed: " + error.message });
    } else {
      res.end();
    }
  }
}

async function hubProxyFunc_get(req, res, next) {
  try {
    const pathAndQuery = req.originalUrl.replace(/^\/hub-proxy/, "");
    const externalURL = hubURL + pathAndQuery;

    const headersToSend = { ...req.headers };
    delete headersToSend.host;
    delete headersToSend.connection;

    const response = await fetch(externalURL, {
      method: "GET",
      headers: headersToSend,
      redirect: "manual",
    });

    const head = new Headers(response.headers);
    head.delete("content-encoding");
    head.delete("transfer-encoding");

    for (const [key, value] of head.entries()) {
      res.setHeader(key, value);
    }

    res.status(response.status);

    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.get("location");
      if (redirectUrl) {
        if (redirectUrl.startsWith(hubURL)) {
          res.setHeader("location", redirectUrl.replace(hubURL, "/hub-proxy"));
        } else if (redirectUrl.startsWith("/")) {
          res.setHeader("location", `/hub-proxy${redirectUrl}`);
        } else {
          res.setHeader("location", redirectUrl);
        }
      }
    }

    await pipeline(response.body, res);
  } catch (error) {
    console.error("[Hub Proxy GET] Error:", error);
    if (!res.headersSent) {
      res.status(502).send({ error: "Proxy request failed: " + error.message });
    } else {
      res.end();
    }
  }
}

app.get("/proxy", reverseProxyFunc_get);
app.get("/proxy2", reverseProxyFunc_get);

app.post("/proxy", reverseProxyFunc);
app.post("/proxy2", reverseProxyFunc);

app.put("/hub-proxy/*", hubProxyFunc);
app.delete("/hub-proxy/*", hubProxyFunc);

app.get("/api/password", async (req, res) => {
  if (password === "") {
    res.send({ status: "unset" });
  } else if (req.headers["risu-auth"] === password) {
    res.send({ status: "correct" });
  } else {
    res.send({ status: "incorrect" });
  }
});

app.post("/api/crypto", async (req, res) => {
  try {
    const hash = crypto.createHash("sha256");
    hash.update(Buffer.from(req.body.data, "utf-8"));
    res.send(hash.digest("hex"));
  } catch (error) {
    next(error);
  }
});

app.post("/api/set_password", async (req, res) => {
  if (password === "") {
    password = req.body.password;
    writeFileSync(passwordPath, password, "utf-8");
  }
  res.status(400).send("already set");
});

app.get("/api/read", async (req, res, next) => {
  if (req.headers["risu-auth"].trim() !== password.trim()) {
    console.log("incorrect");
    res.status(400).send({
      error: "Password Incorrect",
    });
    return;
  }
  const filePath = req.headers["file-path"];
  if (!filePath) {
    console.log("no path");
    res.status(400).send({
      error: "File path required",
    });
    return;
  }

  if (!isHex(filePath)) {
    res.status(400).send({
      error: "Invaild Path",
    });
    return;
  }
  try {
    if (!existsSync(path.join(savePath, filePath))) {
      res.send();
    } else {
      res.setHeader("Content-Type", "application/octet-stream");
      res.sendFile(path.join(savePath, filePath));
    }
  } catch (error) {
    next(error);
  }
});

app.get("/api/remove", async (req, res, next) => {
  if (req.headers["risu-auth"].trim() !== password.trim()) {
    console.log("incorrect");
    res.status(400).send({
      error: "Password Incorrect",
    });
    return;
  }
  const filePath = req.headers["file-path"];
  if (!filePath) {
    res.status(400).send({
      error: "File path required",
    });
    return;
  }
  if (!isHex(filePath)) {
    res.status(400).send({
      error: "Invaild Path",
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

app.get("/api/list", async (req, res, next) => {
  if (req.headers["risu-auth"].trim() !== password.trim()) {
    console.log("incorrect");
    res.status(400).send({
      error: "Password Incorrect",
    });
    return;
  }
  try {
    const data = (await fs.readdir(path.join(savePath))).map((v) => {
      return Buffer.from(v, "hex").toString("utf-8");
    });
    res.send({
      success: true,
      content: data,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/write", async (req, res, next) => {
  if (req.headers["risu-auth"].trim() !== password.trim()) {
    console.log("incorrect");
    res.status(400).send({
      error: "Password Incorrect",
    });
    return;
  }
  const filePath = req.headers["file-path"];
  const fileContent = req.body;
  if (!filePath || !fileContent) {
    res.status(400).send({
      error: "File path required",
    });
    return;
  }
  if (!isHex(filePath)) {
    res.status(400).send({
      error: "Invaild Path",
    });
    return;
  }

  try {
    await fs.writeFile(path.join(savePath, filePath), fileContent);
    res.send({
      success: true,
    });
  } catch (error) {
    next(error);
  }
});

async function getHttpsOptions() {
  const keyPath = path.join(sslPath, "server.key");
  const certPath = path.join(sslPath, "server.crt");

  try {
    await fs.access(keyPath);
    await fs.access(certPath);

    const [key, cert] = await Promise.all([
      fs.readFile(keyPath),
      fs.readFile(certPath),
    ]);

    return { key, cert };
  } catch (error) {
    console.error("[Server] SSL setup errors:", error.message);
    console.log("[Server] Start the server with HTTP instead of HTTPS...");
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
    console.error("[Server] Failed to start server :", error);
    process.exit(1);
  }
}

(async () => {
  await startServer();
})();
