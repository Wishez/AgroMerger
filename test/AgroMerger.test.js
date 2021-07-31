require('dotenv').config()
const { AgroMerger } = require("../src/components/AgroMerger")
const { RepositoryId, SlackDeveloper, TelegramDeveloper } = require('../src/components/constants')
const { GitlabApi } = require("../src/components/Gitlab")
const { JiraApi } = require("../src/components/Jira")
const { SlackApp } = require('../src/components/SlackApp')
const { TelegramBotApi } = require("../src/components/TelegramBot")

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
  repositories: [agromarketGitlab, docsGitlab, emailsGitlab],
  jira: new JiraApi({
    username: JIRA_USER,
    password: JIRA_PASSWORD,
  }),
  messagers: [telegramBot, slackApp],
})

test(
  'Создание инстанса',
  () => {
    expect(agroMerger instanceof AgroMerger).toBeTruthy()
    expect(agroMerger.repositories.length).toBe(3)
    expect(agroMerger.messagers.length).toBe(2)
  }
)

test(
  'Отправка сообщений в мессенджеры',
  async () => {
    const responses = await agroMerger.sendMessage('Интеграционный тест месседжеров с нотификацией создателя', 'fzhuravlev')
    expect(responses.every(({ meta }) => meta.isStatusOk)).toBeTruthy()
  }
)
