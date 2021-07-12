const Router = require('@koa/router');
const { AgroMerger } = require("../components/AgroMerger");
const { GitlabApi } = require("../components/Gitlab");
const { JiraApi } = require("../components/Jira");
const { TelegramBotApi } = require("../components/TelegramBot");

const agroMerger = new AgroMerger({
  gitlab: new GitlabApi(),
  jira: new JiraApi(),
  telegramBot: new TelegramBotApi()
})
const apiRouter = new Router()

apiRouter.post('/merge', async (ctx) => {
  const info = await agroMerger.mergeTickets()
  
  ctx.set('Content-Type', 'application/json')
  ctx.body = JSON.stringify(info)
})

module.exports = {
  apiRouter,
}
