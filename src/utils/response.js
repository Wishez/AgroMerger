const isStatusOk = (response) => response.status >= 200 && response.status < 300

const getResponseStatus = (response, errorStatus = 'ERROR') => isStatusOk(response) ? 'OK' : errorStatus

const getResponse = ({ status = 'OK', message, data } = {}) => ({
  meta: {
    isStatusOk: status === 'OK',
    status,
    message,
  },
  data,
})

module.exports = {
  isStatusOk,
  getResponse,
  getResponseStatus,
}
