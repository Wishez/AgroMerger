const resultBlock = document.querySelector('#result')
const mergingButton = document.querySelector('#merge')
mergingButton.addEventListener('click', () => {
  mergingButton.innerHTML = 'Loading...'
  resultBlock.innerHTML = ''
  axios({ method: 'POST', url: '/api/merge' })
    .then(({ data: result }) => {
      resultBlock.innerHTML = `<h3>Результат мержа: </h3><pre>${typeof result === 'object' ? JSON.stringify(result) : result}</pre>`
    })
    .catch((error) => {
      resultBlock.innerHTML = `Error: ${error.message}`
    })
    .then(() => {
      mergingButton.innerHTML = 'Смержить релизные тикеты'
    })
})
