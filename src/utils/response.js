const isStatusOk = (response) => response.status >= 200 && response.status < 300

module.exports = {
  isStatusOk,
}