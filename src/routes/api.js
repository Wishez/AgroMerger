require('dotenv').config()
const Router = require('@koa/router')
const { AgroMerger } = require("../components/AgroMerger")
const { RepositoryId, TelegramDeveloper, SlackDeveloper, RepositoryName } = require('../components/constants')
const { GitlabApi } = require("../components/Gitlab")
const { JiraApi } = require("../components/Jira")
const { SlackApp } = require("../components/SlackApp")
const { TelegramBotApi } = require("../components/TelegramBot")
const { apiTestRouter } = require('./testApi')

const {
  GITLAB_AGROMARKET_ACCESS_TOKEN,
  GITLAB_DOCS_ACCESS_TOKEN,
  GITLAB_EMAILS_ACCESS_TOKEN,
  GITLAB_POLE_UI_ACCESS_TOKEN,
  GITLAB_ADMIN_ACCESS_TOKEN,
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
const poleUiGitlab = new GitlabApi({ accessToken: GITLAB_POLE_UI_ACCESS_TOKEN, projectId: RepositoryId.poleUi })
const adminGitlab = new GitlabApi({ accessToken: GITLAB_ADMIN_ACCESS_TOKEN, projectId: RepositoryId.admin })

const newJira = new JiraApi({
  projectId: 'DEV',
  mergingUserId: '610189eeb704b40068aa84ba',
  readyToMergeStatus: 'Ready to release',
  closingStatusId: '491',
  baseUrl: 'https://ddinvest.atlassian.net/',
  username: NEW_JIRA_USER,
  password: NEW_JIRA_PASSWORD,
})

const jiraApis = [newJira]
const agroMerger = new AgroMerger({
  repositories: [agromarketGitlab, emailsGitlab, docsGitlab, poleUiGitlab, adminGitlab],
  messagers: [telegramBot, slackApp],
  jiraApis: jiraApis,
})
const apiRouter = new Router()

apiRouter.post('/merge', async (ctx) => {
  const { releaseVersion } = ctx.request?.body || {}
  const data = await agroMerger.mergeReleaseTickets(releaseVersion)

  ctx.set('Content-Type', 'application/json')
  ctx.body = { status: 'OK', data }
})

apiRouter.get('/merge-requests-status', async (ctx) => {
  const { releaseVersion } = ctx.request?.query || {}
  const statusBeforeMerging = await agroMerger.getMergeRequestsStatusBeforeMerging(releaseVersion)
  const message = `Статус к мержу:
    ${Object.keys(statusBeforeMerging).length ? '' : 'Тикетов для мержа нет🤷🏼‍♂️'}
    ${Object.keys(statusBeforeMerging).reduce((acc, projectId) => {
        let projectStatusMessage = `${RepositoryName[projectId]}\n`
        if (statusBeforeMerging[projectId]?.length) {
          projectStatusMessage += `*Количество:* ${statusBeforeMerging[projectId].length}шт.\n`
          projectStatusMessage += `*Тикеры:*\n${statusBeforeMerging[projectId].map((tiketName) => `${tiketName} - ${newJira.baseUrl}browse/${tiketName}`).join('\n')}`
        } else projectStatusMessage += 'Мержить нечего💩'

        return `${acc}${projectStatusMessage}\n\n`
      }, '\n')}
  `
  agroMerger.sendMessage(message)

  ctx.set('Content-Type', 'application/json')
  ctx.body = message
})

apiRouter.use(apiTestRouter.routes())

module.exports = {
  apiRouter,
}
