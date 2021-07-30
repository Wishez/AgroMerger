const { timeout } = require("../utils/helpers")
const filter = require("lodash/filter")
const every = require("lodash/every")
const { DeveloperTelegram, RepositoryName } = require("./constants")
const { PromiseQueue } = require("./PromiseQueue")

class AgroMerger {
  constructor({ repositories, gitlab, jira, telegramBot }) {
    if (typeof repositories === 'undefined' && typeof gitlab === 'undefined') {
      throw Error('Для работы с гитлабом требуется один или более инстансов.')
    }

    this.repositories = repositories || [gitlab]
    this.jira = jira
    this.messager = telegramBot
    this.mergingQueue = new PromiseQueue()
  }

  mergeReleaseTickets = async (releaseVersion) => { 
    const { jira, messager } = this
    const ticketsToMerge = await jira.getTicketsOfReadyToRelease(releaseVersion)

    if (ticketsToMerge.length === 0) {
      const { currentReleaseVersion } = jira
      await messager.sendMessage(
        DeveloperTelegram.commonGroup,
        `Попытался смержить тикеты, но их нет. 
        ${currentReleaseVersion ? `Текущая версия релиза: ${currentReleaseVersion}` : 'Не удалось получить текущую версию релиза.'}`
      )
      return null
    }

    const info = await this.mergeTickets(ticketsToMerge)

    return info
  }

  mergeTicket = async (ticket) => {
    const { repositories, jira, messager } = this
    const { key } = ticket
    const mergingResult = await Promise.all(repositories.map(gitlab => this.mergeMergeRequest(key, gitlab)))
    const MRs = filter(mergingResult, { hasMR: true })
    const shouldCloseTicket = MRs.length > 0 && every(MRs, { isMerged: true })
    if (shouldCloseTicket) {
      const isTicketClosed = await jira.closeTicket(key)
      await messager.sendMessage(
        DeveloperTelegram.commonGroup,
        `${key}

         ${isTicketClosed ? `Тикет закрыл` : `Чот не получилось закрыть тикет:с`}.
         Тикет: https://jira.phoenixit.ru/browse/${key}`
      )
    }

    return Promise.resolve(shouldCloseTicket)
  }

  mergeTickets = (ticketsToMerge) => 
    new Promise((resolve) => {
      const { mergingQueue, mergeTicket } = this
      const tickets = {
        merged: [],
        unable: [],
      }
      const mergingRequests = ticketsToMerge.map((ticket) => 
        mergingQueue.add(() => mergeTicket(ticket))
          .then((isTicketClosed) => {
            tickets[isTicketClosed ? 'merged' : 'unable'].push(ticket.key)
          })
      )

      Promise.all(mergingRequests).then(() => resolve(tickets))
    })

  mergeMergeRequest = async (ticketName, gitlab) => {
    const { mergeRequest, shouldNotTryToMergeMR } = await this.getMR(ticketName, gitlab)
    if (shouldNotTryToMergeMR) return { hasMR: false, isMerged: false }

    await timeout(5000) // Искусственная задержка для обновления данных в базе гитлаба
    const isRebased = await this.rebaseMR(ticketName, mergeRequest, gitlab)
    if (!isRebased) return { hasMR: true, isMerged: false }

    await timeout(5000)
    const isMerged = await this.mergeMR(ticketName, mergeRequest, gitlab)

    return { hasMR: true, isMerged }
  }

  getMR = async (ticketName, gitlab) =>
    gitlab.getMergeRequest(ticketName).then(async (result) => {
      const { messager } = this
      const isTargetBranchNotMaster = result?.target_branch !== 'master'
      if (!result) {
        await messager.sendMessage(
          DeveloperTelegram.commonGroup,
          `Я попытался, однако ветки с именем feature/${ticketName}, в проекте ${RepositoryName[gitlab.projectId]} нет`,
        )
      } else if (isTargetBranchNotMaster) {
        await messager.sendMessage(
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
      const { messager } = this
      const { web_url, author, has_conflicts, blocking_discussions_resolved } = mergeRequest
      const isNotRebased = !isSuccess || has_conflicts
      await messager.sendMessage(
        isNotRebased
          ? DeveloperTelegram[author.username] || DeveloperTelegram.commonGroup
          : DeveloperTelegram.commonGroup,
        isNotRebased 
          ? `Хочу смержить задачку ${ticketName}, однако не получается:с
             ${has_conflicts ? 'Ребейзни её, пожалуйста, там есть конфликты.' : ''}
             ${blocking_discussions_resolved ? '' : 'Комменты не зарезолвлены.'}
             МР: ${web_url}`
          : `Задачка ${ticketName} ребейзнута. Иду мержить;)`,
      )

      return isSuccess
    })

  mergeMR = async (ticketName, mergeRequest, gitlab) =>
    gitlab.mergeMergeRequest(mergeRequest).then(async (isSuccess) => {
      const { web_url, title } = mergeRequest
      const { messager } = this
      await messager.sendMessage(
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