const { JiraApi } = require("../src/components/Jira")

const {
  JIRA_USER,
  JIRA_PASSWORD,
} = process.env
const jiraApi = new JiraApi({
  username: JIRA_USER,
  password: JIRA_PASSWORD,
})

test(
  'Получение текущей версии релиза',
  async () => {
    const { data: currentReleaseVersion } = await jiraApi.getCurrentReleaseVersion()
    expect(currentReleaseVersion).toMatch(/\d+\.\d+\.\d+/)
  }
)

test(
  'Получение тикетов в колонке Ready to merge назначенных на fzhuravlev',
  async () => {
    const { data: tickets } = await jiraApi.getTicketsOfReadyToMerge()
    expect(Array.isArray(tickets)).toBeTruthy()
  }
)

test(
  'Получение тикетов в колонке Ready to merge для текущего релиза',
  async () => {
    const tickets = await jiraApi.getTicketsOfReadyToRelease()
    expect(Array.isArray(tickets)).toBeTruthy()
  }
)

test(
  'Предвижения тикета в статус «Закрыт»',
  async () => {
    const { meta } = await jiraApi.closeTicket('AMPDD-638')
    expect(typeof meta.isStatusOk === 'boolean').toBeTruthy()
  }
)
