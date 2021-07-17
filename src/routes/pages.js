const fs = require('fs')
const path = require('path')
const Router = require('@koa/router')
const pagesRouter = new Router()

pagesRouter.get('/', async (ctx) => {
  const page = await new Promise((resolve, reject) => {
    fs.readFile(path.resolve(__dirname, '../index.html'), (error, data) => {
      if (error) return reject(error)

      resolve(data)
    })
  })
  ctx.set('Content-Type', 'text/html')
  ctx.body = page
})

// TODO нужно словить все урлы и редиректить на главную
pagesRouter.get('/:url', '/:url/:next', (ctx) => {
  ctx.redirect('/')
  ctx.status = 301
})

module.exports = {
  pagesRouter,
}
