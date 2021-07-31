const { default: axios } = require('axios')
const URI = require('urijs')
const { getResponse, getResponseStatus } = require('../utils/response')

class TelegramBotApi {
  constructor({ token }) {
    this.baseUrl = `https://api.telegram.org/bot${token}`
  }

  request = ({ path, method = 'post', query = {}, data }) => axios({
    url: new URI(`${this.baseUrl}${path}`).addQuery(query).toString(),
    headers: { 'Content-Type': 'application/json' },
    data,
    method,
  })

  sendMessage = async (chatId, text) => {
    try {
      const response = await this.request({
        path: '/sendMessage',
        query: {
          chat_id: chatId,
          text,
        },
      })
      return getResponse({ status: getResponseStatus(response), data: response?.data })
    } catch (e) {
      return getResponse({ status: 'ERROR', data: e.response?.data })
    }
  }
}

module.exports = {
  TelegramBotApi,
}