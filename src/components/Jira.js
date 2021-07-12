require('dotenv').config()
const { default: axios } = require('axios');
const base64 = require('base-64');
const get = require('lodash/get');
const { isStatusOk } = require('../utils/response');

const { JIRA_USER, JIRA_PASSWORD } = process.env

class JiraApi {
  baseUrl = 'https://jira.phoenixit.ru/rest/api/2'
  accessToken = base64.encode(`${JIRA_USER}:${JIRA_PASSWORD}`)

  request = ({ path, method = 'GET', data }) => axios({
    url: `${this.baseUrl}${path}`,
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${this.accessToken}` },
    data,
    method,
  })

  getCurrentReleaseVersion = async () => {
    const response = await this.request({
      path: '/issue/createmeta?projectKeys=AMPDD&expand=projects.issuetypes.fields',
    })
    if (!isStatusOk(response)) return null

    return get(response.data, 'projects.0.issuetypes.0.fields.fixVersions.allowedValues', [])
      .filter(({ archived }) => !archived)[0]?.name
  }

  getTicketsOfReadyToMerge = async () => {
    const response = await this.request({
      path: '/search?jql=project%20=%20AMPDD%20AND%20status%20=%20%22READY%20TO%20MERGE%22%20AND%20assignee%20in%20(fzhuravlev)%20ORDER%20BY%20summary%20ASC',
    })
    if (!isStatusOk(response)) return null

    return response.data.issues
  }

  getTicketsOfReadyToRelease = async () => {
    const currentReleaseVersion = await this.getCurrentReleaseVersion()
    if (!currentReleaseVersion) {
      throw Error('Не удалось запросить текущую версию релиза')
    }

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
        }
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