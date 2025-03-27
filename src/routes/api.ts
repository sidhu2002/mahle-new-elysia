import { Elysia } from 'elysia'

export const apiRouter = new Elysia({ prefix: '/api' })
  .get('', () => ({
    message: 'Welcome to the API'
  })) 