const { timeout } = require("../utils/helpers")
const filter = require("lodash/filter")
const every = require("lodash/every")
const { DeveloperTelegram, RepositoryName } = require("./constants")

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
        DeveloperTelegram.commonGroup,
        `Попытался смержить тикеты, но их нет. 
        ${currentReleaseVersion ? `Текущая версия релиза: ${currentReleaseVersion}` : 'Не удалось получить текущую версию релиза.'}`
      )
      return null
    }

    const info = await this.mergeTickets(ticketsToMerge)

    return info
  }

  mergeTickets = (ticketsToMerge) =>
    new Promise((resolve) => {
      const { repositories, jira, telegramBot } = this
      const tickets = {
        merged: [],
        unable: [],
      }
      const mergingRequests = ticketsToMerge.map(async (ticket, index) => {
        const order = index + 1
        await timeout(4000 * order) // Искусственная задержка для обновления данных в базе гитлаба

        const { key } = ticket
        const mergingResult = await Promise.all(repositories.map(gitlab => this.mergeTicket(key, gitlab, order)))
        const MRs = filter(mergingResult, { hasMR: true })
        if (MRs.length > 0 && every(MRs, { isMerged: true })) {
          const isTicketClosed = await jira.closeTicket(key)
          await telegramBot.sendMessage(
            DeveloperTelegram.commonGroup,
            `${key}
  
             ${isTicketClosed ? `Тикет закрыл` : `Чот не получилось закрыть тикет:с`}.
             Тикет: https://jira.phoenixit.ru/browse/${key}`
          )
          tickets.merged.push(key)
        } else tickets.unable.push(key)

        return Promise.resolve()
      })

      Promise.all(mergingRequests).then(() => resolve(tickets))
    })

  mergeTicket = async (ticketName, gitlab, order = 1) => {
    const { mergeRequest, shouldNotTryToMergeMR } = await this.getMR(ticketName, gitlab)
    if (shouldNotTryToMergeMR) return { hasMR: false, isMerged: false }

    const isRebased = await this.rebaseMR(ticketName, mergeRequest, gitlab)
    if (!isRebased) return { hasMR: true, isMerged: false }

    await timeout(4000 * order) // Искусственная задержка для обновления данных в базе гитлаба
    const isMerged = await this.mergeMR(ticketName, mergeRequest, gitlab)

    return { hasMR: true, isMerged }
  }

  getMR = async (ticketName, gitlab) =>
    gitlab.getMergeRequest(ticketName).then(async (result) => {
      const { telegramBot } = this
      const isTargetBranchNotMaster = result?.target_branch !== 'master'
      if (!result) {
        await telegramBot.sendMessage(
          DeveloperTelegram.commonGroup,
          `Я попытался, однако ветки с именем feature/${ticketName}, в проекте ${RepositoryName[gitlab.projectId]} нет`,
        )
      } else if (isTargetBranchNotMaster) {
        await telegramBot.sendMessage(
          DeveloperTelegram.commonGroup,
          `
            Таргет брэнч смотрит ${ticketName} не в master, а на ${result.target_branch}. Пока что мержить не буду:)
            МР: ${result.web_url}
            Тикет: https://jira.phoenixit.ru/browse/${ticketName}
          `,
        )
      }

      return {
        mergeRequest: result,
        shouldNotTryToMergeMR: !result || isTargetBranchNotMaster,
      }
    })

  rebaseMR = async (ticketName, mergeRequest, gitlab) =>
    gitlab.rebaseMergeRequest(mergeRequest).then(async (isSuccess) => {
      const { telegramBot } = this
      const { web_url, author, has_conflicts, merge_status } = mergeRequest
      const canBeMerged = merge_status === 'can_be_merged'
      const isNotRebased = (!isSuccess || has_conflicts) && !canBeMerged

      await telegramBot.sendMessage(
        isNotRebased
          ? DeveloperTelegram[author.username] || DeveloperTelegram.commonGroup
          : DeveloperTelegram.commonGroup,
        isNotRebased 
          ? `Хочу смержить задачку ${ticketName}, однако не получается:с
             ${has_conflicts ? 'Ребейзни её, пожалуйста, там есть конфликты.' : ''}
             МР: ${web_url}`
          : `Задачка ${ticketName} ребейзнута. Иду мержить;)`,
      )

      return canBeMerged
    })

  mergeMR = async (ticketName, mergeRequest, gitlab) =>
    gitlab.mergeMergeRequest(mergeRequest).then(async (isSuccess) => {
      const { web_url, title } = mergeRequest
      const { telegramBot } = this
      await telegramBot.sendMessage(
        DeveloperTelegram.commonGroup,
        `${title}
         ${isSuccess ? `Смержил МР` : `Не смог смержить МР. Посмотрите, что там, плиз`}.
         Тикет: https://jira.phoenixit.ru/browse/${ticketName}
         МР: ${web_url}
        `
      )

      return isSuccess
    })
}

module.exports = {
  AgroMerger,
}