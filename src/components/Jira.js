require('dotenv').config()
const { default: axios } = require('axios')
const base64 = require('base-64')
const get = require('lodash/get')
const { isStatusOk } = require('../utils/response')

class JiraApi {
  constructor({ baseUrl = 'https://jira.phoenixit.ru', username, password }) {
    this.baseUrl = `${baseUrl}/rest/api/2`
    this.accessToken = base64.encode(`${username}:${password}`)
    this.currentReleaseVersion = ''
  }

  request = ({ path, method = 'GET', data }) => axios({
    url: `${this.baseUrl}${path}`,
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
        path: '/issue/createmeta?projectKeys=AMPDD&expand=projects.issuetypes.fields',
      })
      if (!isStatusOk(response)) return null
  
      this.currentReleaseVersion = get(response.data, 'projects.0.issuetypes.0.fields.fixVersions.allowedValues', [])
        .filter(({ archived }) => !archived)[0]?.name
  
      return this.currentReleaseVersion
    } catch (e) {
      return null
    }
  }

  getTicketsOfReadyToMerge = async () => {
    try {
      const response = await this.request({
        // eslint-disable-next-line max-len
        path: '/search?jql=project%20=%20AMPDD%20AND%20status%20=%20%22READY%20TO%20MERGE%22%20AND%20assignee%20in%20(fzhuravlev)%20ORDER%20BY%20summary%20ASC',
      })
      if (!isStatusOk(response)) return []
  
      return response.data.issues
    } catch (e) {
      return []
    }
  }

  getTicketsOfReadyToRelease = async (releaseVersion) => {
    const currentReleaseVersion = await this.getCurrentReleaseVersion(releaseVersion)
    if (!currentReleaseVersion) return []

    const readyToMergeTickets = await this.getTicketsOfReadyToMerge()
    return readyToMergeTickets.filter(({ fields }) => {
      const ticketVersion = fields.fixVersions[0]?.name
      if (!ticketVersion) return false

      return currentReleaseVersion === ticketVersion
    })
  }

  closeTicket = async (ticketName) => {
    try {
      const response = await this.request({
        path: `/issue/${ticketName}/transitions`,
        method: 'POST',
        data: {
          transition: {
            id: "911",
          },
        },
      })

      return isStatusOk(response)
    } catch (e) {
      return false
    }
  }
}

module.exports = {
  JiraApi,
}