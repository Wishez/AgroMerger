class Queue {
  constructor() {
    this._items = []
  }

  set item(item) {
    this._items.push(item)
  }

  get item() {
    return this._items.shift()
  }
}

module.exports = { Queue }
