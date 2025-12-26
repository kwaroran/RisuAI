import app from './app/index.js'
import { serveStatic } from '@hono/node-server/serve-static'

const { serve } = await import('@hono/node-server')
app.use('*', serveStatic({ root: './static' }))

serve({
    fetch: app.fetch,
    port: 3000
}, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`)
})