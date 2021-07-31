require('dotenv').config()
const { TelegramBotApi } = require("../src/components/TelegramBot")

const { TELEGRAM_BOT_TOKEN } = process.env
const botApi = new TelegramBotApi({ token: TELEGRAM_BOT_TOKEN })

test(
  'Отправка сообщения @it_shiningfinger',
  async () => {
    // Проверка айди пользователя: https://telegram.me/userinfobot
    const { meta } = await botApi.sendMessage('462566829', 'Итеграционный тест бота, не обращайте внимания:)')

    expect(meta.isStatusOk).toBeTruthy()
  }
)