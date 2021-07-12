const { JiraApi } = require("../src/components/Jira");

const jiraApi = new JiraApi()

test(
  'Получение текущей версии релиза',
  async () => {
    const currentReleaseVersion = await jiraApi.getCurrentReleaseVersion()
    expect(currentReleaseVersion).toMatch(/\d+\.\d+\.\d+/)
  }
)

test(
  'Получение тикетов в колонке Ready to merge назначенных на fzhuravlev',
  async () => {
    const tickets = await jiraApi.getTicketsOfReadyToMerge()
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
    const isTicketClosed = await jiraApi.closeTicket('AMPDD-638')
    expect(typeof isTicketClosed === 'boolean').toBeTruthy()
  }
)
