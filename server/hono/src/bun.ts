import app from './app/index.js'
import { serveStatic } from 'hono/bun'

app.use('*', serveStatic({ root: './static' }))
export default app