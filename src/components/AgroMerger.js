const { timeout } = require("../utils/helpers")
const filter = require("lodash/filter")
const every = require("lodash/every")
const { RepositoryName } = require("./constants")
const { PromiseQueue } = require("./PromiseQueue")

class AgroMerger {
  constructor({ repositories = [], jiraApis = [], messagers = [] }) {
    if (repositories?.length < 1) {
      throw Error('Для работы с гитлабом требуется один или более инстансов.')
    }
    if (jiraApis?.length < 1) {
      throw Error('Для работы с джирой требуется один или более инстансов.')
    }
    if (messagers?.length < 1) {
      throw Error('Укажи хотя бы один месседжер для нотификаций')
    }

    this.repositories = repositories
    this.jiraApis = jiraApis
    this.messagers = messagers
    this.mergingQueue = new PromiseQueue()
  }

  sendMessage = (message, authorNickname) =>
    Promise.all(
      this.messagers.map(({ channels, messager }) => {
        const developer = channels[authorNickname]

        return messager.sendMessage(
          channels.commonGroup,
          `${developer || ''} ${message}`,
        )
      })
    )

  mergeReleaseTickets = async (releaseVersion) => { 
    const { jiraApis, sendMessage } = this
    const ticketsPromises = await Promise.all(jiraApis.map(jira => jira.getTicketsOfReadyToRelease(releaseVersion)))
    const ticketsToMerge = ticketsPromises.flat()

    if (ticketsToMerge.length === 0) {
      const { currentReleaseVersion } = jiraApis[0]
      await sendMessage(
        `
        Попытался смержить тикеты, однако не нашёл их🤷🏼‍♂️
        Текущая версия релиза: *${currentReleaseVersion}*
        `
      )
      return null
    }

    const info = await this.mergeTickets(ticketsToMerge)

    return info
  }

  mergeTicket = async (ticket) => {
    const { repositories, jiraApis, sendMessage } = this
    const { key } = ticket
    const jira = jiraApis.find(jira => key.includes(jira.projectId))
    const mergingResult = await Promise.all(repositories.map(gitlab => this.mergeMergeRequest({ ticketName: key, gitlab, jira })))
    const MRs = filter(mergingResult, { hasMR: true })
    const shouldCloseTicket = MRs.length > 0 && every(MRs, { isMerged: true })
    if (shouldCloseTicket) {
      const { meta } = await jira.closeTicket(key)
      await sendMessage(
        `*Задачка*: ${key}

         ${meta.isStatusOk ? `Тикет закрыл` : `Не получилось закрыть тикет:с`}.
         *Тикет*: ${jira.baseUrl}/browse/${key}`
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

  mergeMergeRequest = async ({ ticketName, gitlab, jira }) => {
    const baseMergingConfig = { ticketName, gitlab, jira }
    const { mergeRequest, shouldNotTryToMergeMR } = await this.getMR(baseMergingConfig)
    if (shouldNotTryToMergeMR) return { hasMR: false, isMerged: false }

    await timeout(5000) // Искусственная задержка для обновления данных в базе гитлаба
    const mergingConfigWithMR = { mergeRequest, ...baseMergingConfig }
    const isRebased = await this.rebaseMR(mergingConfigWithMR)
    if (!isRebased) return { hasMR: true, isMerged: false }

    await timeout(5000)
    const isMerged = await this.mergeMR(mergingConfigWithMR)

    return { hasMR: true, isMerged }
  }

  getMR = async ({ ticketName, gitlab, jira }) =>
    gitlab.getMergeRequest(ticketName).then(async ({ data: MR }) => {
      const { target_branch, web_url } = MR || {}
      const { sendMessage } = this
      const isTargetBranchNotMaster = target_branch !== 'master'
      const projectName = RepositoryName[gitlab.projectId]
      if (!MR) {
        await sendMessage(`Ветки feature/${ticketName} нет в проекте ${projectName}🤓`)
      } else if (isTargetBranchNotMaster) {
        await sendMessage(
          `
            Таргет брэнч тикета *${ticketName}* в проекте ${projectName} смотрит не в master, а на *${target_branch}*😠
            Пока что мержить не буду😤

            *МР*: ${web_url}
            *Тикет*: ${jira.baseUrl}/browse/${ticketName}
          `,
        )
      }

      return {
        mergeRequest: MR,
        shouldNotTryToMergeMR: !MR || isTargetBranchNotMaster,
      }
    })

  rebaseMR = async ({ ticketName, mergeRequest, gitlab, jira }) =>
    gitlab.rebaseMergeRequest(mergeRequest).then(async ({ meta }) => {
      const { isStatusOk } = meta
      const { web_url, author, has_conflicts, blocking_discussions_resolved } = mergeRequest
      const isNotRebased = !isStatusOk || has_conflicts
      const projectName = RepositoryName[gitlab.projectId]
      await this.sendMessage(
        isNotRebased 
          ? `Хочу смержить задачку *${ticketName}* в проекте ${projectName}, однако не получается🤔
             ${has_conflicts ? 'Есть конфликты ребейза🐭' : ''}
             ${blocking_discussions_resolved ? '' : 'Комменты не зарезолвлены🐷'}
             *МР*: ${web_url}
             *Тикет*: ${jira.baseUrl}/browse/${ticketName} 
             `
          : `Задачка *${ticketName}* проекта ${projectName} ребейзнута. Иду мержить😎`,
        author.username,
      )

      return isStatusOk
    })

  mergeMR = async ({ ticketName, mergeRequest, gitlab, jira }) =>
    gitlab.mergeMergeRequest(mergeRequest).then(async ({ meta }) => {
      const { isStatusOk } = meta
      const { web_url, title } = mergeRequest
      await this.sendMessage(
        `*${title}*
         ${isStatusOk ? `Смержил МР🤫` : `Не смог смержить МР👽`}.
         *Тикет*: ${jira.baseUrl}/browse/${ticketName}
         *МР*: ${web_url}
        `
      )

      return isStatusOk
    })
}

module.exports = {
  AgroMerger,
}