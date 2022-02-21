require('dotenv').config()
const Router = require('@koa/router')
const { AgroMerger } = require("../components/AgroMerger")
const { RepositoryId, SlackDeveloper, TelegramDeveloper } = require('../components/constants')
const { GitlabApi } = require("../components/Gitlab")
const { JiraApi } = require("../components/Jira")
const { SlackApp } = require('../components/SlackApp')
const { TelegramBotApi } = require("../components/TelegramBot")
const { timeout } = require('../utils/helpers')

const {
  GITLAB_AGROMARKET_ACCESS_TOKEN,
  GITLAB_DOCS_ACCESS_TOKEN,
  GITLAB_EMAILS_ACCESS_TOKEN,
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
const repositories = [agromarketGitlab, emailsGitlab, docsGitlab]

const newJira = new JiraApi({
  projectId: 'DEV',
  mergingUserId: '610189eeb704b40068aa84ba',
  readyToMergeStatus: 'Ready to release',
  closingStatusId: '491',
  baseUrl: 'https://ddinvest.atlassian.net/',
  username: NEW_JIRA_USER,
  password: NEW_JIRA_PASSWORD,
})

const agroMerger = new AgroMerger({
  messagers: [telegramBot, slackApp],
  repositories,
  jiraApis: [newJira],
})
const apiTestRouter = new Router()

const targetBranchName = 'AMPDD-target_test'
const sourceBranchName = 'AMPDD-source_test'
apiTestRouter.get('/test/merge', async (ctx) => {
  await deleteTestMergeRequests()

  await timeout(4000)
  
  await Promise.all(repositories.reduce((result, gitlab) => [
      ...result,
      gitlab.createBranch(targetBranchName, 'master'),
      gitlab.createBranch(sourceBranchName, `feature/${targetBranchName}`),
    ], []))

  await timeout(4000)

  await Promise.all(repositories.map((gitlab) => gitlab.createMergeRequest({
    targetBranchName: `feature/${targetBranchName}`,
    ticketName: sourceBranchName,
    title: `${sourceBranchName} - Бот могёт создавать мерж реквесты`,
  })))

  await timeout(4000)

  await agroMerger.mergeTickets([{ key: sourceBranchName }])
    .then((ticketsInfo) => {
      deleteTestMergeRequests()

      ctx.set('Content-Type', 'application/json')
      ctx.body = ticketsInfo
    })
})

async function deleteTestMergeRequests() {
  repositories.map(async (gitlab) => {
    const mergeRequest = await gitlab.getMergeRequest(sourceBranchName)
    const { iid } = mergeRequest
    const isDeleted = await gitlab.deleteMergeRequest(iid)
    console.log(`МР ${iid} ${isDeleted ? '' : 'не'} удалён`)
  })

  repositories.forEach(async (gitlab) => {
    const isSourceBranchDeleted = await gitlab.deleteBranch(sourceBranchName)
    const isTargetBranchDeleted = await gitlab.deleteBranch(targetBranchName)
    console.log(`Branch ${sourceBranchName} ${isSourceBranchDeleted ? '' : 'не'} удалён`)
    console.log(`Branch ${targetBranchName} ${isTargetBranchDeleted ? '' : 'не'} удалён`)
  })
}

module.exports = {
  apiTestRouter,
}