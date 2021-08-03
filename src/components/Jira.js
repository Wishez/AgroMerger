require('dotenv').config()
const { default: axios } = require('axios')
const base64 = require('base-64')
const get = require('lodash/get')
const { getResponse, getResponseStatus } = require('../utils/response')

/*
 new JiraApi({
   projectId: 'DEV',
   mergingUserId: '610189eeb704b40068aa84ba',
   readyToMergeStatus: 'Ready to release',
   closingStatusId: '31',
   baseUrl: 'https://ddinvest.atlassian.net/',
   username: NEW_JIRA_USER,
   password: NEW_JIRA_PASSWORD,
 })
 new JiraApi({
   projectId: 'AMPDD',
   mergingUserId: 'fzhuravlev',
   readyToMergeStatus: 'READY TO MERGE',
   closingStatusId: '911',
   baseUrl: 'https://jira.phoenixit.ru',
   username: OLD_JIRA_USER,
   password: OLD_JIRA_PASSWORD,
 })
*/

class JiraApi {
  constructor(config) {
    const {
      baseUrl,
      username,
      password,
      projectId,
      mergingUserId,
      closingStatusId,
      readyToMergeStatus,
    } = config
    this.baseUrl = baseUrl
    this.accessToken = base64.encode(`${username}:${password}`)
    this.currentReleaseVersion = ''
    this.projectId = projectId
    this.readyForMergeTicketsJql = `project = ${projectId} AND status = "${readyToMergeStatus}" AND assignee in (${mergingUserId})`
    this.closingStatusId = closingStatusId
  }

  request = ({ path, method = 'GET', data }) => axios({
    url: `${this.baseUrl}/rest/api/2${path}`,
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${this.accessToken}` },
    data,
    method,
  })

  getCurrentReleaseVersion = async (releaseVersion) => {
    if (releaseVersion) {
      this.currentReleaseVersion = releaseVersion
      return releaseVersion
    }

    try {
      const response = await this.request({
        path: `/issue/createmeta?projectKeys=${this.projectId}&expand=projects.issuetypes.fields`,
      })
      this.currentReleaseVersion = get(response.data, 'projects.0.issuetypes.0.fields.fixVersions.allowedValues', [])
        .filter(({ archived, released }) => !archived && !released)[0]?.name || null
  
      return getResponse({ status: getResponseStatus(response), data: this.currentReleaseVersion })
    } catch (e) {
      return getResponse({ status: 'ERROR', data: null, message: e.response?.data })
    }
  }

  getTicketsOfReadyToMerge = async (releaseVersion) => {
    try {
      const jql = encodeURIComponent(`${this.readyForMergeTicketsJql}${releaseVersion ? ` AND fixVersion = ${releaseVersion}` : ''}`)
      const response = await this.request({ path: `/search?jql=${jql}` })

      return getResponse({ status: getResponseStatus(response), data: response?.data?.issues || [] })
    } catch (e) {
      return getResponse({ status: 'ERROR', data: [] })
    }
  }

  getTicketsOfReadyToRelease = async (releaseVersion) => {
    const { data: currentReleaseVersion } = await this.getCurrentReleaseVersion(releaseVersion)
    if (!currentReleaseVersion) return []

    const { data: readyToMergeTickets } = await this.getTicketsOfReadyToMerge(currentReleaseVersion)
    return readyToMergeTickets
  }

  closeTicket = async (ticketName) => {
    try {
      const response = await this.request({
        path: `/issue/${ticketName}/transitions`,
        method: 'POST',
        data: {
          transition: { id: this.closingStatusId },
        },
      })

      return getResponse({ status: getResponseStatus(response) })
    } catch (e) {
      return getResponse({ status: 'ERROR' })
    }
  }
}

module.exports = {
  JiraApi,
}