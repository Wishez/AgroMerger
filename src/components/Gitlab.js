require('dotenv').config()
const { default: axios } = require('axios')
const { isStatusOk } = require('../utils/response')

class GitlabApi {
  baseUrl = 'https://git.agro-it.team/api/v4'
  accessToken = process.env.GITLAB_ACCESS_TOKEN

  request = ({ path, method = 'GET', data }) => axios({
    url: `${this.baseUrl}${path}`,
    headers: { 'Content-Type': 'application/json', 'PRIVATE-TOKEN': this.accessToken },
    data,
    method,
  })

  getMergeRequest = async (ticketName, projectId) => {
    try {
      const response = await this.request({
        path: `/projects/${projectId}/merge_requests?source_branch=feature/${ticketName}`,
      }) 

      return isStatusOk(response) ? response.data?.[0] : null
    } catch (e) {
      return null
    }
  }

  rebaseMergeRequest = async (mergeRequest) => {
    try {
      const { source_project_id, iid } = mergeRequest
      const response = await this.request({
        path: `/projects/${source_project_id}/merge_requests/${iid}/rebase`,
        method: 'PUT',
      })

      return isStatusOk(response)
    } catch (e) {
      return false
    }
  }

  mergeMergeRequest = async (mergeRequest) => {
    try {
      const { source_project_id, iid } = mergeRequest
      const response = await this.request({
        path: `/projects/${source_project_id}/merge_requests/${iid}/merge`,
        method: 'PUT'
      })

      return isStatusOk(response)
    } catch (e) {
      return false
    }
  }
}

module.exports = {
  GitlabApi,
}