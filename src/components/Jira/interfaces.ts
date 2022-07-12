
export interface IJiraUser {
  self: `https://ddinvest.atlassian.net/rest/api/2/user?accountId=${string}`
  accountId: string
  emailAddress: string
  avatarUrls: {
    "48x48": string
    "24x24": string
    "16x16": string
    "32x32": string
  },
  displayName: string
  active: boolean,
  timeZone: string
  accountType: string
}

export interface IJiraComponent {
  self: `https://ddinvest.atlassian.net/rest/api/2/component/${string}`
  id: string
  name: string
  description: string
}

export interface IJiraStatus {
  self: `https://ddinvest.atlassian.net/rest/api/2/status/${string}`
  description: string
  iconUrl: string
  name: string
  id: string
  statusCategory: {
    self: string
    id: number,
    key: string
    colorName: string
    name: number,
  },
}

interface IJiraPriority {
  self: `https://ddinvest.atlassian.net/rest/api/2/priority/${string}`
  iconUrl: string
  name: string
  id: string
}

export interface IJiraIssueType {
  self: `https://ddinvest.atlassian.net/rest/api/2/issuetype/${string}`
  id: string
  description: string
  iconUrl: string
  name: string
  subtask: boolean,
  avatarId: number,
  hierarchyLevel: number,
}

export interface IJiraAvatar {
  "48x48": string
  "24x24": string
  "16x16": string
  "32x32": string
}

export interface IJiraCustomFieldOption {
  self: `https://ddinvest.atlassian.net/rest/api/2/customFieldOption/${string}`,
  value: string
  id: string
}

export interface IJiraReleaseVersion {
  self: `https://ddinvest.atlassian.net/rest/api/2/version/${string}`,
  id: string
  description: string
  name: string
  archived: boolean
  released: boolean
}

export interface IJiraProject {
  self: `https://ddinvest.atlassian.net/rest/api/2/project/${string}`,
  id: string
  key: string
  name: string
  projectTypeKey: string
  simplified: boolean,
  avatarUrls: IJiraAvatar
}

export interface IJiraSprint {
  id: number
  name: string
  state: string
  boardId: number
  goal: string
  startDate: string
  endDate: string
}

export interface IJiraProgress {
  progress: number
  total: number
  percent: number
}

export interface IJiraIssue {
  id: string,
  key: string
  self: `https://ddinvest.atlassian.net/rest/api/2/issue/${string}`,
  fields: {
    summary: string
    status: IJiraStatus
    priority: IJiraPriority
    issuetype: IJiraIssueType
  },
}

export interface IJiraIssueLinkType {
  id: string
  name: string
  inward: string
  outward: string
  self: `https://ddinvest.atlassian.net/rest/api/2/issueLinkType/${string}`,
}

export interface IJiraIssueLink {
  id: string,
  self: `https://ddinvest.atlassian.net/rest/api/2/issueLink/${string}`,
  type: IJiraIssueLinkType
  inwardIssue: IJiraIssue
}

export interface IJiraTicket {
  expand: string
  fields: {
    statuscategorychangedate: string
    issuetype: IJiraIssueType
    timespent: null,
    project: IJiraProject
    fixVersions: IJiraReleaseVersion[]
    aggregatetimespent: null,
    resolution: null,
    customfield_10035: null,
    /* Developer тикета */
    customfield_10036: IJiraUser
    // Тип задачи
    customfield_10037: IJiraCustomFieldOption
    resolutiondate: null,
    workratio: 0,
    watches: {
      self: string,
      watchCount: number,
      isWatching: boolean,
    },
    lastViewed: string
    created: string
    customfield_10020: [IJiraSprint],
    customfield_10021: null,
    customfield_10022: null,
    priority: IJiraPriority
    customfield_10023: null,
    customfield_10024: string
    customfield_10025: null,
    labels: unknown[]
    customfield_10016: null,
    customfield_10017: null,
    // Epic
    customfield_10018: {
      hasEpicLinkFieldDependency: boolean
      showField: boolean
      nonEditableReason: {
        reason: string
        message: string
      },
    },
    customfield_10019: string
    aggregatetimeoriginalestimate: number
    timeestimate: number
    versions: any[],
    issuelinks: IJiraIssueLink[]
    assignee: IJiraUser,
    updated: string
    status: IJiraStatus
    components: IJiraComponent[]
    customfield_10050: null,
    customfield_10051: null,
    timeoriginalestimate: number,
    customfield_10052: null,
    description: null,
    customfield_10053: null,
    customfield_10054: null,
    customfield_10010: null,
    customfield_10055: null,
    customfield_10014: null,
    customfield_10015: null,
    customfield_10005: null,
    customfield_10049: null,
    customfield_10006: null,
    customfield_10007: null,
    security: null,
    customfield_10008: null,
    customfield_10009: null,
    aggregatetimeestimate: number,
    summary: string
    creator: IJiraUser
    subtasks: unknown[],
    customfield_10040: null,
    customfield_10041: null,
    customfield_10042: null,
    reporter: IJiraUser
    customfield_10043: null,
    customfield_10044: null,
    aggregateprogress: IJiraProgress
    customfield_10000: string
    customfield_10001: null
    customfield_10046: null
    customfield_10002: null
    customfield_10047: null
    customfield_10003: null
    customfield_10048: null
    customfield_10004: null
    customfield_10038: IJiraCustomFieldOption
    customfield_10039: [
    ],
    environment: null,
    duedate: null,
    progress: IJiraProgress
    votes: {
      self: `https://ddinvest.atlassian.net/rest/api/2/issue/${string}/votes`,
      votes: number,
      hasVoted: boolean,
    },
  }
  id: string
  key: string
  self: `https://ddinvest.atlassian.net/rest/api/2/issue/${string}`
}