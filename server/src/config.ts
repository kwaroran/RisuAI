import path from "node:path";

const sslPath = path.join(process.cwd(), 'server/node/ssl/certificate');
export const distDir = path.join(process.cwd(), 'dist');
export const hubURL = 'https://sv.risuai.xyz';
export const keyPath = path.join(sslPath, 'server.key');
export const certPath = path.join(sslPath, 'server.crt');
