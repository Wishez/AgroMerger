require('dotenv').config()
const Router = require('@koa/router')
const { AgroMerger } = require("../components/AgroMerger")
const { RepositoryId, TelegramDeveloper, SlackDeveloper } = require('../components/constants')
const { GitlabApi } = require("../components/Gitlab")
const { JiraApi } = require("../components/Jira")
const { SlackApp } = require("../components/SlackApp")
const { TelegramBotApi } = require("../components/TelegramBot")
const { apiTestRouter } = require('./testApi')

const {
  GITLAB_AGROMARKET_ACCESS_TOKEN,
  GITLAB_DOCS_ACCESS_TOKEN,
  GITLAB_EMAILS_ACCESS_TOKEN,
  JIRA_USER,
  JIRA_PASSWORD,
  TELEGRAM_BOT_TOKEN,
  SLACK_TOKEN,
} = process.env
const telegramBot = { messager: new TelegramBotApi({ token: TELEGRAM_BOT_TOKEN }), channels: TelegramDeveloper } 
const slackApp = { messager: new SlackApp({ token: SLACK_TOKEN }), channels: SlackDeveloper }
const agromarketGitlab = new GitlabApi({ accessToken: GITLAB_AGROMARKET_ACCESS_TOKEN, projectId: RepositoryId.agromarket })
const docsGitlab = new GitlabApi({ accessToken: GITLAB_DOCS_ACCESS_TOKEN, projectId: RepositoryId.documents })
const emailsGitlab = new GitlabApi({ accessToken: GITLAB_EMAILS_ACCESS_TOKEN, projectId: RepositoryId.emails })

const agroMerger = new AgroMerger({
  repositories: [agromarketGitlab, emailsGitlab, docsGitlab],
  messagers: [telegramBot, slackApp],
  jira: new JiraApi({
    username: JIRA_USER,
    password: JIRA_PASSWORD,
  }),
})
const apiRouter = new Router()

apiRouter.post('/merge', async (ctx) => {
  const { releaseVersion } = ctx.request?.body || {}
  const data = await agroMerger.mergeReleaseTickets(releaseVersion)
  
  ctx.set('Content-Type', 'application/json')
  ctx.body = { status: 'OK', data }
})

apiRouter.use(apiTestRouter.routes())

module.exports = {
  apiRouter,
}
