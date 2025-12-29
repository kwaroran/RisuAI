import { Hono } from 'hono'
import { csrf } from 'hono/csrf'

const app = new Hono()

app.use('*', csrf())

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app