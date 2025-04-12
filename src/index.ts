import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'

// Import routes
import { healthRouter } from './routes/health'
import { apiRouter } from './routes/api'
import { queryRouter } from './routes/query.routes'

const app = new Elysia()
  // Add middleware
  .use(cors())
  .use(swagger({
    documentation: {
      info: {
        title: 'AWS Query API',
        version: '1.0.0'
      }
    }
  }))
  // Add a root route
  .get('/', () => {
    return {
      message: 'Welcome to AWS Query API',
      docs: '/swagger'
    }
  })
  // Add routes
  .use(healthRouter)
  .use(apiRouter)
  .use(queryRouter)
  // Error handling
  .onError(({ code, error, set }) => {
    switch (code) {
      case 'NOT_FOUND':
        set.status = 404
        return { error: 'Not Found' }
      default:
        set.status = 500
        return { error: 'Internal Server Error' }
    }
  })

// Start the server
const port = process.env.PORT || 3001
// app.config.host = '0.0.0.0'
app.listen(port, () => {
  console.log(`🦊 Server running at http://0.0.0.0:${port}`)
})
