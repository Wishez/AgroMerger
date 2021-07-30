const { Queue } = require("./Queue")

class PromiseQueue extends Queue {
  constructor() {
    super()
    this._isPromisePending = false
  }

   add(action) {
    return new Promise((resolve, reject) => {
      super.item = { action, resolve, reject }
      this.run()
    })
  }

  async run() {
    if (this._isPromisePending) return false

    const { item } = this
    if (!item) return false

    try {
      this._isPromisePending = true
      const payload = await item.action()
      this._isPromisePending = false
      item.resolve(payload)
    } catch (e) {
      this._isPromisePending = false
      item.reject(e)
    } finally {
      this.run()
    }

    return true
  }
}

module.exports = { PromiseQueue }
