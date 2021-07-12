const timeout = (delay) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, delay)
  })
}


module.exports = {
  timeout,
}
