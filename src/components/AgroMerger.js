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

  getReadyToReleaseTickets = async (releaseVersion) => {
    const ticketsPromises = await Promise.all(this.jiraApis.map(jira => jira.getTicketsOfReadyToRelease(releaseVersion)))

    return ticketsPromises.flat()
  }

  getMergeRequestsStatusBeforeMerging = async (releaseVersion) => {
    const ticketsToMerge = await this.getReadyToReleaseTickets(releaseVersion)
    const result = await new Promise(async (resolve) => {
      const ticketsWithMergeRequests = await Promise.all(ticketsToMerge.reduce((result, ticket) => 
        [
          ...result,
          ...this.repositories.map(
            gitlab =>
              gitlab.getMergeRequest(ticket.key)
                .then(({ data }) => ({
                  hasMr: Boolean(data),
                  mergeRequest: data, 
                  ticket,
                  projectId: gitlab.projectId, 
                  ticketName: ticket.key, 
                  wasMerged: Boolean(data?.merged_by),
                }))
          )
        ],
        [],
      ))

      const sortedByProjectTicketsWithMergeRequests = {}
      ticketsWithMergeRequests.forEach(({ hasMr, projectId, ticketName, ticket, mergeRequest }) => {
        if (!sortedByProjectTicketsWithMergeRequests[projectId]) sortedByProjectTicketsWithMergeRequests[projectId] = { projectId, tickets: [] }
        if (hasMr) sortedByProjectTicketsWithMergeRequests[projectId].tickets.push({ ticketName, mergeRequest, ticket })
      })

      resolve({ sortedByProjectTicketsWithMergeRequests, releaseVersion: this.jiraApis[0].currentReleaseVersion })
    })

    return result
  }

  mergeReleaseTickets = async (releaseVersion) => {
    const ticketsToMerge = await this.getReadyToReleaseTickets(releaseVersion)

    if (ticketsToMerge.length === 0) {
      const { currentReleaseVersion } = this.jiraApis[0]
      await this.sendMessage(
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
    const { key: ticketName, fields } = ticket
    const jira = jiraApis.find(jira => ticketName.includes(jira.projectId))

    this.sendMessage(
      `\n\n\n*${ticketName}* 💜 ${fields.summary} 🐊 ${fields.customfield_10036?.displayName}
       \n${jira.baseUrl}browse/${ticketName}`
    )

    const mergingResult = await Promise.all(repositories.map(gitlab => this.makeWholeProcessForMergingTicket({ ticketName, gitlab })))
    const MRs = filter(mergingResult, { hasMR: true })
    const shouldCloseTicket = MRs.length > 0 && every(MRs, { isMerged: true })
    if (shouldCloseTicket) {
      const { meta } = await jira.closeTicket(ticketName)
      await sendMessage(`${meta.isStatusOk ? `Тикет закрыл` : `Не получилось закрыть тикет:с`}.`)
    }

    return Promise.resolve(shouldCloseTicket)
  }

  mergeTickets = (ticketsToMerge) => 
    new Promise((resolve) => {
      const tickets = {
        merged: [],
        unable: [],
      }
      const mergingRequests = ticketsToMerge.map((ticket) => 
        this.mergingQueue.add(() => this.mergeTicket(ticket))
          .then((isTicketClosed) => {
            tickets[isTicketClosed ? 'merged' : 'unable'].push(ticket.key)
          })
      )

      Promise.all(mergingRequests).then(() => resolve(tickets))
    })

  makeWholeProcessForMergingTicket = async ({ ticketName, gitlab }) => {
    const { mergeRequest, shouldNotTryToMergeMR, isAlreadyMerged } = await this.getMR({ ticketName, gitlab })
    if (!mergeRequest) return { hasMR: false, isMerged: false }

    if (isAlreadyMerged) return { hasMR: true, isMerged: true }
    if (shouldNotTryToMergeMR) return { hasMR: true, isMerged: false }

    await timeout(5000) // Искусственная задержка для обновления данных в базе гитлаба
    const isRebased = await this.rebaseMR({ ticketName, mergeRequest, gitlab })
    if (!isRebased) return { hasMR: true, isMerged: false }

    await timeout(5000)
    const isMerged = await this.mergeMR({ mergeRequest, gitlab })

    return { hasMR: true, isMerged }
  }

  getMR = async ({ ticketName, gitlab }) =>
    gitlab.getMergeRequest(ticketName).then(async ({ data: MR }) => {
      const { target_branch, web_url } = MR || {}
      const { sendMessage } = this
      const isTargetBranchNotMaster = target_branch !== 'master'
      const projectName = RepositoryName[gitlab.projectId]
      const isAlreadyMerged = Boolean(MR?.merged_by)

      if (isAlreadyMerged) {
        await sendMessage(`*Уже была смержена* в проект ${projectName}🐙\n${web_url}`)
      } else if (!MR) {
        await sendMessage(`Нет в проекте ${projectName}🤓\n`)
      } else if (isTargetBranchNotMaster) {
        await sendMessage(
          `
            Таргет брэнч в проекте *${projectName}* смотрит не в master, а на *${target_branch}*😠
            Пока что мержить не буду😤
            ${web_url}
          `,
        )
      }

      return {
        mergeRequest: MR,
        shouldNotTryToMergeMR: isTargetBranchNotMaster || isAlreadyMerged,
        isAlreadyMerged,
      }
    })

  rebaseMR = async ({ ticketName, mergeRequest, gitlab }) =>
    gitlab.rebaseMergeRequest(mergeRequest).then(async ({ meta }) => {
      const { isStatusOk } = meta
      const { author, has_conflicts, blocking_discussions_resolved } = mergeRequest
      const isNotRebased = !isStatusOk || has_conflicts
      const projectName = RepositoryName[gitlab.projectId]
      const shouldAskDeveloperForRebase = isNotRebased && has_conflicts

      await this.sendMessage(
        `${isNotRebased 
          ? `Хочу смержить задачку *${ticketName}* в проекте ${projectName}, однако не получается🤔
              ${shouldAskDeveloperForRebase ? 'Есть конфликты ребейза🐭' : ''}
              ${blocking_discussions_resolved ? '' : 'Комменты не зарезолвлены🐷'}
            `
          : `Задачка *${ticketName}* проекта ${projectName} ребейзнута. Иду мержить😎`}`
      )

      if (shouldAskDeveloperForRebase) {
        await this.sendMessage(`
          Сделай, пожалуйста, рибейз и отпиши в трэд, как закончишь🙏🏽
        `, author.username)
      }

      return isStatusOk
    })

  mergeMR = async ({ mergeRequest, gitlab }) =>
    gitlab.mergeMergeRequest(mergeRequest).then(async ({ meta }) => {
      const { isStatusOk } = meta
      await this.sendMessage(
        `${isStatusOk ? `Смержил МР🤫` : `Не смог смержить МР👽`}.`
      )

      return isStatusOk
    })
}

module.exports = {
  AgroMerger,
}