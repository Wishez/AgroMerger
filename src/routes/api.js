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
  OLD_JIRA_USER,
  OLD_JIRA_PASSWORD,
  NEW_JIRA_USER,
  NEW_JIRA_PASSWORD,
  TELEGRAM_BOT_TOKEN,
  SLACK_TOKEN,
} = process.env

const telegramBot = { messager: new TelegramBotApi({ token: TELEGRAM_BOT_TOKEN }), channels: TelegramDeveloper } 
const slackApp = { messager: new SlackApp({ token: SLACK_TOKEN }), channels: SlackDeveloper }

const agromarketGitlab = new GitlabApi({ accessToken: GITLAB_AGROMARKET_ACCESS_TOKEN, projectId: RepositoryId.agromarket })
const docsGitlab = new GitlabApi({ accessToken: GITLAB_DOCS_ACCESS_TOKEN, projectId: RepositoryId.documents })
const emailsGitlab = new GitlabApi({ accessToken: GITLAB_EMAILS_ACCESS_TOKEN, projectId: RepositoryId.emails })

const oldJira = new JiraApi({
  projectId: 'AMPDD',
  mergingUserId: 'fzhuravlev',
  readyToMergeStatus: 'READY TO MERGE',
  closingStatusId: '911',
  baseUrl: 'https://jira.phoenixit.ru',
  username: OLD_JIRA_USER,
  password: OLD_JIRA_PASSWORD,
})
const newJira = new JiraApi({
  projectId: 'DEV',
  mergingUserId: '610189eeb704b40068aa84ba',
  readyToMergeStatus: 'Ready to release',
  closingStatusId: '31',
  baseUrl: 'https://ddinvest.atlassian.net/',
  username: NEW_JIRA_USER,
  password: NEW_JIRA_PASSWORD,
})

const agroMerger = new AgroMerger({
  repositories: [agromarketGitlab, emailsGitlab, docsGitlab],
  messagers: [telegramBot, slackApp],
  jiraApis: [oldJira, newJira],
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
