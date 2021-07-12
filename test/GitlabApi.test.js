const { GitlabApi } = require("../src/components/Gitlab");

const gitlabApi = new GitlabApi()

test(
  'Запрос мерж реквеста', 
  () => 
    gitlabApi.getMergeRequest('AMPDD-1154', 16)
      .then((mergeRequest) => {
        expect(mergeRequest.iid).toBe(298)
      })
)

test(
  'Ребейз мерж реквеста', 
  async () => {
    const ticketName = 'AMPDD-1154'
    const mergeRequest = await gitlabApi.getMergeRequest(ticketName, 16)
    
    return gitlabApi.rebaseMergeRequest(mergeRequest).then((isBranchRebased) => {
      expect(typeof isBranchRebased === 'boolean').toBeTruthy()
    })
  }
)

// Тест мержа требуется делать на тестовых данных:)
