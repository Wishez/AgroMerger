require('dotenv').config()
const Koa = require('koa');
const path = require('path');
const serveStaticFiles = require('koa-static');
const mount = require('koa-mount');
const { apiRouter } = require('./routes/api');
const { pagesRouter } = require('./routes/pages');
const app = new Koa();

// logger

app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.get('X-Response-Time');
  console.log(`${ctx.method} ${ctx.url} - ${rt}`);
});

// x-response-time

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
});

app.on('error', err => {
  console.error('server error', err)
});

app.use(mount('/static', serveStaticFiles(path.resolve(__dirname, 'static'))))
app.use(mount('/api', apiRouter.routes()))
app
  .use(pagesRouter.routes())
  .use(pagesRouter.allowedMethods());

app.listen(4000);