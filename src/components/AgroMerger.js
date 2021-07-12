const { timeout } = require("../utils/helpers")
const { RepositoryId, DeveloperTelegram } = require("./constants")
class AgroMerger {
  constructor({ gitlab, jira, telegramBot }) {
    this.gitlab = gitlab
    this.jira = jira
    this.telegramBot = telegramBot
  }

  mergeTickets = async () => {
    const { jira, telegramBot } = this
    const ticketsToMerge = await jira.getTicketsOfReadyToRelease()
    const tickets = {
      merged: [],
      unable: []
    }

    if (ticketsToMerge.length === 0) {
      const { currentReleaseVersion } = jira
      await telegramBot.sendMessage(
        DeveloperTelegram.mergingNotice,
        `Попытался смержить тикеты, но их нет. ${currentReleaseVersion ? `Текущая версия релиза: ${currentReleaseVersion}` : 'Не удалось получить текущую версию релиза.'}`
      )
      return null
    }


    return new Promise(async (resolve) => {
      ticketsToMerge.forEach(async (ticket, index) => {
        await timeout(5000)

        const { key } = ticket
        const isAgromarketMerged = await this.mergeTicket(key, RepositoryId.agromarket)
        if (isAgromarketMerged) {
          const isTicketClosed = await jira.closeTicket(key)
          await telegramBot.sendMessage(
            DeveloperTelegram.mergingNotice,
            `${key}
  
             ${isTicketClosed ? `Тикет закрыл` : `Чот не получилось закрыть тикет:с`}.
             Тикет: https://jira.phoenixit.ru/browse/${key}`
          )
          tickets.merged.push(key)
        } else tickets.unable.push(key)

        if (index === ticketsToMerge.length - 1) resolve(tickets)
      })
    })
  }

  mergeTicket = async (ticketName, projectId) => {
    const { gitlab, telegramBot } = this
    const mergeRequest = await gitlab.getMergeRequest(ticketName, projectId).then(async (result) => {
      if (!result) {
        await telegramBot.sendMessage(
          DeveloperTelegram.mergingNotice,
          `Я попытался, однако ветки с именем feature/${ticketName}, в проекте ${prjectId} нет`,
        )
  
      }

      return result
    })

    if (!mergeRequest) return false

    const { web_url, author, title, has_conflicts, merge_status } = mergeRequest
    await gitlab.rebaseMergeRequest(mergeRequest).then(async (isSuccess) => {
      const isNotRebased = !isSuccess || has_conflicts || merge_status !== 'can_be_merged'
      await telegramBot.sendMessage(
        DeveloperTelegram[author.username] || DeveloperTelegram.mergingNotice,
        isNotRebased 
          ? `Хочу смержить задачку ${ticketName}, однако не получается:с Ребейзни её, пожалуйста, там есть конфликты. Вот ссылка: ${web_url}`
          : `Задачка ${ticketName} ребейзнута. Иду мержить;)`,
      )

      return isSuccess
    })

    await timeout(1000)

    const isMergeRequestMerged = await gitlab.mergeMergeRequest(mergeRequest).then(async (isSuccess) => {
      await telegramBot.sendMessage(
        DeveloperTelegram.mergingNotice,
        `${title}
         ${isSuccess ? `Смержил МР` : `Не смержил МР. Посмотрите, что там, плиз`}.
         Тикет: https://jira.phoenixit.ru/browse/${ticketName}
         МР: ${web_url}
        `
      )

      return isSuccess
    })

    return isMergeRequestMerged
  }
}

module.exports = {
  AgroMerger,
}