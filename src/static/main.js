/* eslint-disable no-undef */
class ButtonControl {
  constructor(selector) {
    this.button = document.querySelector(selector)
    this.buttonText = this.button.textContent
  }

  showLoadingState = () => {
    this.button.innerHTML = 'Loading...'
    this.button.setAttribute('disabled', 'true')
  }

  hideLoadingState = () => {
    this.button.removeAttribute('disabled')
    this.button.innerHTML = this.buttonText
  }

  addClick = (eventHandler) => {
    this.button.addEventListener('click', eventHandler)
  }
}

const mergingButton = new ButtonControl('#merge')
const resultBlock = document.querySelector('#result')
const releaseVersionInput = document.querySelector('#releaseVersion')
mergingButton.addClick(() => {
  mergingButton.showLoadingState()
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
    .then(mergingButton.hideLoadingState)
})

const gettingMergeRequestsStatusButton = new ButtonControl('#get-merge-requests-status')
gettingMergeRequestsStatusButton.addClick(() => {
  gettingMergeRequestsStatusButton.showLoadingState()
  resultBlock.innerHTML = ''
  axios({
    method: 'GET',
    url: '/api/merge-requests-status',
    data : { releaseVersion: releaseVersionInput.value },
    headers: { 'Content-Type': 'application/json'},
  })
    .then(({ data: result }) => {
      resultBlock.innerHTML = `
        <h3>Количество мерж реквестов: </h3>
        <pre>${result}</pre>
      `
    })
    .catch((error) => {
      resultBlock.innerHTML = `Error: ${error.message}`
    })
    .then(gettingMergeRequestsStatusButton.hideLoadingState)
})
