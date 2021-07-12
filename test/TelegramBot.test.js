const { TelegramBotApi } = require("../src/components/TelegramBot");

const botApi = new TelegramBotApi()

test(
  'Отправка сообщения @it_shiningfinger',
  async () => {
    // Проверка айди пользователя: https://telegram.me/userinfobot
    const isMessageSent = await botApi.sendMessage('462566829', 'Приветик. Jest-test')

    expect(isMessageSent).toBeTruthy()
  }
)