const { default: axios } = require('axios')
const URI = require('urijs')
const { getResponse } = require('../utils/response')

class SlackApp {
  constructor({ token }) {
    if (!token) throw Error('Нужно предоставить токен, чтобы пользоваться апи слэка')

    this.token = token
  }

  request = ({ path, method = 'post', query = {}, data }) => axios({
    url: new URI(`https://slack.com/api/${path}`).addQuery(query).toString(),
    headers: { 'Content-Type': 'application/json;charset=utf-8', Authorization: `Bearer ${this.token}` },
    data,
    method,
  })

  sendMessage = async (channel, text) => {
    try {
      const response = await this.request({
        path: 'chat.postMessage',
        data: {
          channel,
          text,
          link_names: true,
          parse: 'full',
        },
      })
      const { ok } = response.data || {}
      return getResponse({ status: ok ? 'OK' : 'ERROR', data: response.data })
    } catch (e) {
      return getResponse({ status: 'ERROR', data: e.response?.data })
    }
  }
}

module.exports = {
  SlackApp,
}