const { JiraApi } = require("../src/components/Jira")

const {
  OLD_JIRA_USER,
  OLD_JIRA_PASSWORD,
  NEW_JIRA_USER,
  NEW_JIRA_PASSWORD,
} = process.env
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
  closingStatusId: '491',
  baseUrl: 'https://ddinvest.atlassian.net/',
  username: NEW_JIRA_USER,
  password: NEW_JIRA_PASSWORD,
})

test(
  'Получение текущей версии релиза',
  async () => {
    const { data: oldJiraCurrentReleaseVersion } = await oldJira.getCurrentReleaseVersion()
    const { data: newJiraCurrentReleaseVersion } = await newJira.getCurrentReleaseVersion()
    const versionRegexp = /\d+\.\d+\.\d+/
    expect(oldJiraCurrentReleaseVersion).toMatch(versionRegexp)
    expect(newJiraCurrentReleaseVersion).toMatch(versionRegexp)
  }
)

test(
  'Получение тикетов в колонке Ready to merge назначенных на fzhuravlev',
  async () => {
    const { data: oldJiraTickets, meta: oldJiraResponseMeta } = await oldJira.getTicketsOfReadyToMerge()
    const { data: newJiraTickets, meta: newJiraResponseMeta } = await newJira.getTicketsOfReadyToMerge()
    expect(Array.isArray(newJiraTickets)).toBeTruthy()
    expect(Array.isArray(oldJiraTickets)).toBeTruthy()
    expect(oldJiraResponseMeta.isStatusOk).toBeTruthy()
    expect(newJiraResponseMeta.isStatusOk).toBeTruthy()
  }
)

test(
  'Получение тикетов в колонке Ready to merge для текущего релиза',
  async () => {
    const oldJiraTickets = await oldJira.getTicketsOfReadyToRelease()
    const newJiraTickets = await newJira.getTicketsOfReadyToRelease()
    expect(Array.isArray(newJiraTickets)).toBeTruthy()
    expect(Array.isArray(oldJiraTickets)).toBeTruthy()
  }
)

test(
  'Предвижения тикета в статус «Закрыт»',
  async () => {
    const { meta: oldJiraResponseMeta } = await oldJira.closeTicket('AMPDD-638')
    const { meta: newJiraResponseMeta } = await newJira.closeTicket('DEV-1')
    expect(typeof oldJiraResponseMeta.isStatusOk === 'boolean').toBeTruthy()
    expect(typeof newJiraResponseMeta.isStatusOk === 'boolean').toBeTruthy()
  }
)
