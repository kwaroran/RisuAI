import app from './app/index.js'

const { serve } = await import('@hono/node-server')
serve({
    fetch: app.fetch,
    port: 3000
}, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`)
})