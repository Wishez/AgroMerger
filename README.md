## TODO
1. Сделать удобный ответ от сервисов, к примеру, { meta: { status: 'OK', message: '' }, data: null }
2. Сделать апи работы со слэком

## Авторизация: 
  gitlab: Токены для гитлаба из переменных окружения `{GITLAB_AGROMARKET_ACCESS_TOKEN}`, `{GITLAB_DOCS_ACCESS_TOKEN}`, `{GITLAB_EMAILS_ACCESS_TOKEN}`

  jira: Из переменных окружения, строка `{JIRA_USER}:{JIRA_PASSWORD}` превращёная через **base64** в хэш и переданный в заголовок `Authentication: Basic {token}`

## Подготовка к запросам
В каждый запрос: 
1. В апи гитлаба подставлять хэдер с токеном: `PRIVATE-TOKEN: {ACCESS_TOKEN}`
2. В апи jira подставлять токен бэсик авторизации Authentication: `Basic {base64(`${JIRA_USER}:${JIRA_PASSWORD}`)}`
3. В апи бота телеги подставлять хедер Content-Type: application/json

## Псевдо реализация
1. Получить версии тикетов
  * Апи: GET https://jira.phoenixit.ru/rest/api/2/issue/createmeta?projectKeys=AMPDD&expand=projects.issuetypes.fields
  * Актуальную версию релиза нужно достать из 
      `projects[0].issuetypes[0].fields.fixVersions.allowedValues.filter(({ archived }) => !archived)[0].name`
      (актуальная версия - это **первая, не помеченая флагом archived**, версия)
2. Получить готовые к мержу задачки
  * Апи: GET https://jira.phoenixit.ru/rest/api/2/search?jql=project%20=%20AMPDD%20AND%20status%20=%20%22READY%20TO%20MERGE%22%20AND%20assignee%20in%20(fzhuravlev)%20ORDER%20BY%20summary%20ASC
3. Отфильтровать вресии готовых к мержу тикетов (**из пункта 4а**) по актуальной версии релиза (**пункт 3б**)
4. Пройтись по каждой задачки, которую требуется смержить для релиза
  * Получить данные о мерж реквесте (автор, айдишник мерж реквеста)
    Примечание: Требуется проверять бранчи в нескольких проектах. Доки (**id=28**), эмейлы (**id=26**), агромаркет (**id=16**)
    Дока: https://docs.gitlab.com/ee/api/merge_requests.html#list-merge-requests
    Апи: GET https://git.agro-it.team/api/v4/projects/16/merge_requests?source_branch=feature/AMPDD-number
 * Нужно попробовать ребейзнуть ветку, если ещё не ребейзнута {
    Отправить экшон на ребейз 
    Апи: PUT https://git.agro-it.team/api/v4/projects/16/merge_requests/:merge_request_iid/rebase
    Дока: https://docs.gitlab.com/ee/api/merge_requests.html#rebase-a-merge-request
  }
  ЕСЛИ невозможно ребейзнуть {
    Отправить нотификацию в телегу разрабу (составить справочник никнеймов телеги по никнеймам в гитлабе)
    Дока: https://core.telegram.org/bots/api#sendmessage
    Апи: POST https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage
    Content-Type: application/json
    Query string
      chat_id: developers[gitlabNickname], // string or int, @channelusername or identifier 
      text: `Боту не удалось ребейзнуть задчаку ${ticketName}. ${developerName}, ребейзни, плииз:) ${mergeRequestLink}`,
  }
  ИНАЧЕ {
    1. Дернуть апи на мерж
      Дока: https://docs.gitlab.com/ee/api/merge_requests.html#merge-to-default-merge-ref-path
      Апи: PUT https://git.agro-it.team/api/v4//projects/16/merge_requests/:merge_request_iid/merge
    2. Закрыть тикет
      Дока: 
        https://docs.atlassian.com/software/jira/docs/api/REST/7.11.0/#api/2/issue-doTransition
        https://community.atlassian.com/t5/Jira-questions/How-to-change-the-issue-status-by-REST-API-in-JIRA/qaq-p/850658
        Просмотр айдишников: https://jira.phoenixit.ru/rest/api/2/issue/AMPDD-638/transitions?expand=transitions.fields
      Апи: POST https://jira.phoenixit.ru/rest/api/2/issue/AMPDD-number/transitions
      BODY: 
      {
        transition: {
          id: "911", // айдишник статуса Закрыт https://jira.phoenixit.ru/rest/api/2/issue/AMPDD-638/transitions?expand=transitions.fields
        },
      }
    3. Оповестить о закрытие задачи
      Дока https://core.telegram.org/bots/api#sendmessage
      Апи: POST https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage
      Content-Type: application/json
      Query string
        chat_id: {@Имя чата для оповещения смерженных задач}, // string or int, @channelusername or identifier 
        text: `
          Задача, ${ticketName} входящая в релиз v${currentReleaseVersion}, смержена.
          МР: ${mergeRequestUrl}.
          Тикет: ${ticketUrl}.`,
  }