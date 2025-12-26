import fs from 'fs'

//this is expected to run in root dir

fs.cpSync('./dist', 'server/hono/src/static', { recursive: true })
fs.cpSync('./dist', 'server/hono/src/.vercel/output/static', { recursive: true })