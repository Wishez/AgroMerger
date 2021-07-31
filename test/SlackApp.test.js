require('dotenv').config()
const { SlackApp } = require("../src/components/SlackApp");

const { SLACK_TOKEN } = process.env
const slackApp = new SlackApp({ token: SLACK_TOKEN })

test(
  'Отправка сообщения в слэк',
  async () => {
    const { meta } = await slackApp.sendMessage('C029LGA9R5L', '*Интеграционный тест*. Не обращайте внимания')

    expect(meta.isStatusOk).toBeTruthy()
  }
)