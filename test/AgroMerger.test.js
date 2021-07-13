require('dotenv').config()
const { AgroMerger } = require("../src/components/AgroMerger");
const { RepositoryId } = require('../src/components/constants');
const { GitlabApi } = require("../src/components/Gitlab");
const { JiraApi } = require("../src/components/Jira");
const { TelegramBotApi } = require("../src/components/TelegramBot");

const { GITLAB_AGROMARKET_ACCESS_TOKEN, GITLAB_DOCS_ACCESS_TOKEN, GITLAB_EMAILS_ACCESS_TOKEN } = process.env

const agromarketGitlab = new GitlabApi({ accessToken: GITLAB_AGROMARKET_ACCESS_TOKEN, projectId: RepositoryId.agromarket })
const docsGitlab = new GitlabApi({ accessToken: GITLAB_DOCS_ACCESS_TOKEN, projectId: RepositoryId.documents })
const emailsGitlab = new GitlabApi({ accessToken: GITLAB_EMAILS_ACCESS_TOKEN, projectId: RepositoryId.emails })
const repositories = [agromarketGitlab, docsGitlab, emailsGitlab]
const agroMerger = new AgroMerger({
  repositories,
  jira: new JiraApi(),
  telegramBot: new TelegramBotApi()
})

test(
  'Создание инстанса',
  async () => {
    expect(agroMerger instanceof AgroMerger).toBeTruthy()
  }
)