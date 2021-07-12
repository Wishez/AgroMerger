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
    const response = await this.request({
      path: `/projects/${projectId}/merge_requests?source_branch=feature/${ticketName}`,
    }) 
    if (!isStatusOk(response)) return null

    return response.data?.[0]
  }

  rebaseMergeRequest = async (mergeRequest) => {
    const { has_conflicts, merge_status, source_project_id, iid } = mergeRequest
    if (has_conflicts || merge_status !== 'can_be_merged') return false

    const response = await this.request({
      path: `/projects/${source_project_id}/merge_requests/${iid}/rebase`,
      method: 'PUT',
    })

    return isStatusOk(response)
  }

  mergeMergeRequest = async (mergeRequest) => {
    const { source_project_id, iid } = mergeRequest
    const response = await this.request({
      path: `/projects/${source_project_id}/merge_requests/${iid}/merge_ref`,
    })

    return isStatusOk(response)
  }
}

module.exports = {
  GitlabApi,
}