const fs = require('fs');
const path = require('path');
const Router = require('@koa/router');
const pagesRouter = new Router()

pagesRouter.get('/', (ctx) => {
  const page = fs.readFileSync(path.resolve(__dirname, '../index.html'))
  ctx.set('Content-Type', 'text/html')
  ctx.body = page
})

// TODO нужно словить все урлы и редиректить на главную
pagesRouter.get('/:url', '/:url/:next', (ctx) => {
  ctx.redirect('/')
  ctx.status = 301
})

module.exports = {
  pagesRouter
}
