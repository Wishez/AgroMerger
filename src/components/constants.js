const TelegramDeveloper = {
  fzhuravlev: '462566829',
  vkeller: '408930891',
  edus: '80436397',
  'v.domnin': '414812130',
  'Nikolai.Maslak': '734712562',
  commonGroup: '-474825792',
  ealyakin: undefined,
  rudakoff31: undefined,
  aabdullatipov: undefined,
  'Denis.Olkhovik': undefined,
  vkornyshev: undefined,
}

const SlackDeveloper = {
  fzhuravlev: '<@U028MMJU6LD> Фил Ж.',
  vkeller: '<@U028QN69X5G> Вероника К.',
  ealyakin: '<@U028MMK00LD> Женёк А.',
  'Nikolai.Maslak': '<@U028LTU016E> Коля М.',
  'nmaksimenko': '<@U028LTU016E> Никита М.',
  commonGroup: 'C029LGA9R5L',
  rudakoff31: undefined,
}

const RepositoryId = {
  agromarket: 16,
  documents: 28,
  emails: 26,
  poleUi: 43,
  admin: 42,
}

const RepositoryName = {
  [RepositoryId.agromarket]: '«Агромаркет»',
  [RepositoryId.documents]: '«Документы»',
  [RepositoryId.emails]: '«Эмейлы»',
  [RepositoryId.poleUi]: '«Pole UI»',
  [RepositoryId.admin]: '«Админка менеджера»',
}

module.exports = {
  TelegramDeveloper,
  RepositoryId,
  RepositoryName,
  SlackDeveloper,
}
