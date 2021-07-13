const { timeout } = require("../utils/helpers")
const { DeveloperTelegram } = require("./constants")
class AgroMerger {
  constructor({ repositories, gitlab, jira, telegramBot }) {
    if (typeof repositories === 'undefined' && typeof gitlab === 'undefined') {
      throw Error('Для работы с гитлабом требуется один или более инстансов.')
    }

    this.repositories = repositories || [gitlab]
    this.jira = jira
    this.telegramBot = telegramBot
  }

  mergeReleaseTickets = async (releaseVersion) => { 
    const { jira, telegramBot } = this
    const ticketsToMerge = await jira.getTicketsOfReadyToRelease(releaseVersion)

    if (ticketsToMerge.length === 0) {
      const { currentReleaseVersion } = jira
      await telegramBot.sendMessage(
        DeveloperTelegram.mergingNotice,
        `Попытался смержить тикеты, но их нет. ${currentReleaseVersion ? `Текущая версия релиза: ${currentReleaseVersion}` : 'Не удалось получить текущую версию релиза.'}`
      )
      return null
    }

    const info = await this.mergeTickets(ticketsToMerge)

    return info
  }

  mergeTickets = async (ticketsToMerge) => {
    const { repositories } = this
    const tickets = {
      merged: [],
      unable: []
    }

    return new Promise(async (resolve) => {
      ticketsToMerge.forEach(async (ticket, index) => {
        await timeout(5000)

        const { key } = ticket
        const mergingPromises = await Promise.all(repositories.map(gitlab => this.mergeTicket(key, gitlab)))

        if (mergingPromises.some(Boolean)) {
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

  mergeTicket = async (ticketName, gitlab) => {
    const { telegramBot } = this
    const { projectId } = gitlab
    const mergeRequest = await gitlab.getMergeRequest(ticketName).then(async (result) => {
      if (!result) {
        await telegramBot.sendMessage(
          DeveloperTelegram.mergingNotice,
          `Я попытался, однако ветки с именем feature/${ticketName}, в проекте ${projectId} нет`,
        )
  
      }

      return result
    })

    if (!mergeRequest) return false

    const { web_url, author, title, has_conflicts, merge_status } = mergeRequest
    await gitlab.rebaseMergeRequest(mergeRequest).then(async (isSuccess) => {
      const isNotRebased = !isSuccess || has_conflicts || merge_status !== 'can_be_merged'
      await telegramBot.sendMessage(
        isNotRebased
          ? DeveloperTelegram[author.username] || DeveloperTelegram.mergingNotice
          : DeveloperTelegram.mergingNotice,
        isNotRebased 
          ? `Хочу смержить задачку ${ticketName}, однако не получается:с Ребейзни её, пожалуйста, там есть конфликты. Вот ссылка: ${web_url}`
          : `Задачка ${ticketName} ребейзнута. Иду мержить;)`,
      )

      return isSuccess
    })

    await timeout(4000)

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