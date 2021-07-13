require('dotenv').config()
const Router = require('@koa/router');
const { AgroMerger } = require("../components/AgroMerger");
const { RepositoryId } = require('../components/constants');
const { GitlabApi } = require("../components/Gitlab");
const { JiraApi } = require("../components/Jira");
const { TelegramBotApi } = require("../components/TelegramBot");
const { apiTestRouter } = require('./api.test');

const { GITLAB_AGROMARKET_ACCESS_TOKEN, GITLAB_DOCS_ACCESS_TOKEN, GITLAB_EMAILS_ACCESS_TOKEN } = process.env
const jira = new JiraApi()
const telegramBot = new TelegramBotApi()
const agromarketGitlab = new GitlabApi({ accessToken: GITLAB_AGROMARKET_ACCESS_TOKEN, projectId: RepositoryId.agromarket })
const docsGitlab = new GitlabApi({ accessToken: GITLAB_DOCS_ACCESS_TOKEN, projectId: RepositoryId.documents })
const emailsGitlab = new GitlabApi({ accessToken: GITLAB_EMAILS_ACCESS_TOKEN, projectId: RepositoryId.emails })
const repositories = [agromarketGitlab, emailsGitlab, docsGitlab]

const agroMerger = new AgroMerger({ repositories, jira, telegramBot })
const apiRouter = new Router()

apiRouter.post('/merge', async (ctx) => {
  const { releaseVersion } = ctx.request?.body || {}
  await agroMerger.mergeReleaseTickets(releaseVersion)
  
  ctx.set('Content-Type', 'application/json')
  ctx.body = { status: 'OK' }
})

apiRouter.use(apiTestRouter.routes())

module.exports = {
  apiRouter,
}
