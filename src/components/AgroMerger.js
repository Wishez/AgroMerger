const { timeout } = require("../utils/helpers")
const filter = require("lodash/filter")
const every = require("lodash/every")
const { RepositoryName } = require("./constants")
const { PromiseQueue } = require("./PromiseQueue")

class AgroMerger {
  constructor({ repositories, jira, messagers = [] }) {
    if (repositories?.length < 1) {
      throw Error('Для работы с гитлабом требуется один или более инстансов.')
    }
    if (messagers?.length < 1) {
      throw Error('Укажи хотя бы один месседжер для нотификаций')
    }

    this.repositories = repositories
    this.jira = jira
    this.messagers = messagers
    this.mergingQueue = new PromiseQueue()
  }

  sendMessage = (message, authorNickname) =>
    Promise.all(
      this.messagers.map(({ channels, messager }) => {
        const developer = channels[authorNickname]

        return messager.sendMessage(
          channels.commonGroup,
          `${developer ? `<@${developer}>` : ''} ${message}`,
        )
      })
    )

  mergeReleaseTickets = async (releaseVersion) => { 
    const { jira, sendMessage } = this
    const ticketsToMerge = await jira.getTicketsOfReadyToRelease(releaseVersion)

    if (ticketsToMerge.length === 0) {
      const { currentReleaseVersion } = jira
      await sendMessage(
        `
        Попытался смержить тикеты, однако не нашёл их. 
        ${currentReleaseVersion ? `Текущая версия релиза: *${currentReleaseVersion}*` : 'Не удалось получить текущую версию релиза.'}
        `
      )
      return null
    }

    const info = await this.mergeTickets(ticketsToMerge)

    return info
  }

  mergeTicket = async (ticket) => {
    const { repositories, jira, sendMessage } = this
    const { key } = ticket
    const mergingResult = await Promise.all(repositories.map(gitlab => this.mergeMergeRequest(key, gitlab)))
    const MRs = filter(mergingResult, { hasMR: true })
    const shouldCloseTicket = MRs.length > 0 && every(MRs, { isMerged: true })
    if (shouldCloseTicket) {
      const { meta } = await jira.closeTicket(key)
      await sendMessage(
        `${key}

         ${meta.isStatusOk ? `Тикет закрыл` : `Не получилось закрыть тикет:с`}.
         *Тикет*: https://jira.phoenixit.ru/browse/${key}`
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
    gitlab.getMergeRequest(ticketName).then(async ({ data: MR }) => {
      const { target_branch, web_url } = MR || {}
      const { sendMessage } = this
      const isTargetBranchNotMaster = target_branch !== 'master'
      if (!MR) {
        await sendMessage(
          `Я попытался, однако ветки с именем feature/${ticketName}, в проекте ${RepositoryName[gitlab.projectId]} нет`,
        )
      } else if (isTargetBranchNotMaster) {
        await sendMessage(
          `
            Таргет брэнч тикета *${ticketName}* смотрит не в master, а на *${target_branch}*. Пока что мержить не буду
            *МР*: ${web_url}
            *Тикет*: https://jira.phoenixit.ru/browse/${ticketName}
          `,
        )
      }

      return {
        mergeRequest: MR,
        shouldNotTryToMergeMR: !MR || isTargetBranchNotMaster,
      }
    })

  rebaseMR = async (ticketName, mergeRequest, gitlab) =>
    gitlab.rebaseMergeRequest(mergeRequest).then(async ({ meta }) => {
      const { isStatusOk } = meta
      const { web_url, author, has_conflicts, blocking_discussions_resolved } = mergeRequest
      const isNotRebased = !isStatusOk || has_conflicts
      await this.sendMessage(
        isNotRebased 
          ? `Хочу смержить задачку *${ticketName}*, однако не получается:с
             ${has_conflicts ? 'Ребейзни её, пожалуйста, там есть конфликты.' : ''}
             ${blocking_discussions_resolved ? '' : 'Комменты не зарезолвлены.'}
             *МР*: ${web_url}`
          : `Задачка *${ticketName}* ребейзнута. Иду мержить;)`,
        isNotRebased ? undefined : author.username,
      )

      return isStatusOk
    })

  mergeMR = async (ticketName, mergeRequest, gitlab) =>
    gitlab.mergeMergeRequest(mergeRequest).then(async ({ meta }) => {
      const { isStatusOk } = meta
      const { web_url, title } = mergeRequest
      await this.sendMessage(
        `${title}
         ${isStatusOk ? `Смержил МР` : `Не смог смержить МР. Посмотрите, что там, плиз`}.
         *Тикет*: https://jira.phoenixit.ru/browse/${ticketName}
         *МР*: ${web_url}
        `
      )

      return isStatusOk
    })
}

module.exports = {
  AgroMerger,
}