const timeout = (delay) => new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, delay)
  })


module.exports = {
  timeout,
}
