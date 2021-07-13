require('dotenv').config()
const { default: axios } = require('axios')
const URI = require('urijs')
const { isStatusOk } = require('../utils/response')

class GitlabApi {
  constructor({ baseUrl, accessToken, projectId }) {
    this.baseUrl = baseUrl || 'https://git.agro-it.team/api/v4'
    this.accessToken = accessToken
    this.projectId = projectId
  }

  request = ({ path, method = 'GET', data, query = {} }) => axios({
    url: new URI(`${this.baseUrl}${path}`).addQuery(query).toString(),
    headers: { 'Content-Type': 'application/json', 'PRIVATE-TOKEN': this.accessToken },
    data,
    method,
  })

  getMergeRequest = async (ticketName) => {
    try {
      const response = await this.request({
        path: `/projects/${this.projectId}/merge_requests?source_branch=feature/${ticketName}`,
      }) 

      return isStatusOk(response) ? response.data?.[0] : null
    } catch (e) {
      return null
    }
  }

  createBranch = async (ticketName, targetBranchName) => {
    try {
      const response = await this.request({
        path: `/projects/${this.projectId}/repository/branches`,
        method: 'POST',
        query: {
          branch: `feature/${ticketName}`,
          ref: targetBranchName,
        }
      }) 

      return isStatusOk(response) ? response.data : null
    } catch (e) {
      return null
    }
  }

  deleteBranch = async (ticketName) => {
    try {
      const response = await this.request({
        path: `/projects/${this.projectId}/repository/branches/${encodeURIComponent(`feature/${ticketName}`)}`,
        method: 'DELETE',
      }) 

      return isStatusOk(response)
    } catch (e) {
      return false
    }
  }

  createMergeRequest = async ({ ticketName, targetBranchName, title }) => {
    try {
      const response = await this.request({
        path: `/projects/${this.projectId}/merge_requests`,
        method: 'POST',
        data: {
          source_branch: `feature/${ticketName}`,
          target_branch: targetBranchName,
          title,
        }
      }) 

      return isStatusOk(response) ? response.data : null
    } catch (e) {
      return null
    }
  }

  deleteMergeRequest = async (iid) => {
    try {
      const response = await this.request({
        path: `/projects/${this.projectId}/merge_requests/${iid}`,
        method: 'DELETE',
      }) 

      return isStatusOk(response)
    } catch (e) {
      console.log(e.response.data)
      return false
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