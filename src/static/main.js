/* eslint-disable no-undef */
const resultBlock = document.querySelector('#result')
const mergingButton = document.querySelector('#merge')
const releaseVersionInput = document.querySelector('#releaseVersion')
mergingButton.addEventListener('click', () => {
  mergingButton.innerHTML = 'Loading...'
  mergingButton.setAttribute('disabled', 'true')
  resultBlock.innerHTML = ''
  axios({
    method: 'POST',
    url: '/api/merge',
    data : { releaseVersion: releaseVersionInput.value },
    headers: { 'Content-Type': 'application/json'},
  })
    .then(({ data: result }) => {
      resultBlock.innerHTML = `
        <h3>Результат мержа: </h3>
        <pre>${typeof result === 'object' ? JSON.stringify(result, null, 4) : result}</pre>
      `
    })
    .catch((error) => {
      resultBlock.innerHTML = `Error: ${error.message}`
    })
    .then(() => {
      mergingButton.removeAttribute('disabled')
      mergingButton.innerHTML = 'Смержить релизные тикеты'
    })
})
