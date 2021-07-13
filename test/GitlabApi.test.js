require('dotenv').config()
const { GitlabApi } = require("../src/components/Gitlab");

const gitlabApi = new GitlabApi({ accessToken: process.env.GITLAB_AGROMARKET_ACCESS_TOKEN, projectId: 16 })
const docsGitlabApi = new GitlabApi({ accessToken: process.env.GITLAB_DOCS_ACCESS_TOKEN, projectId: 28 })

test(
  'Запрос мерж реквеста', 
  () =>  docsGitlabApi.getMergeRequest('AMPDD-1007')
    .then((mergeRequest) => {
      expect(mergeRequest?.iid).toBe(53)
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

// test(
//   'Мерж мерж реквеста', 
//   async () => {
//     const ticketName = 'AMPDD-1153'
//     const mergeRequest = await gitlabApi.getMergeRequest(ticketName, 16)
    
//     return gitlabApi.mergeMergeRequest(mergeRequest).then((isMerged) => {
//       expect(typeof isMerged === 'boolean').toBeTruthy()
//     })
//   }
// )
