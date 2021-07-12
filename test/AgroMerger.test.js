const { AgroMerger } = require("../src/components/AgroMerger");
const { GitlabApi } = require("../src/components/Gitlab");
const { JiraApi } = require("../src/components/Jira");
const { TelegramBotApi } = require("../src/components/TelegramBot");

const agroMerger = new AgroMerger({
  gitlab: new GitlabApi(),
  jira: new JiraApi(),
  telegramBot: new TelegramBotApi()
})

// test(
//   'Мерж задачки',
//   async () => {
//     return agroMerger.mergeTickets().then((ticketsInfo) => {
//       expect(typeof ticketsInfo).toBe('object')
//     })
//   }
// )