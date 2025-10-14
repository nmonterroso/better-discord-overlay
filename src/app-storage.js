const fs = require('fs')
const path = require('path')

class AppStorage {
  constructor(electronApp) {
    const file = 'mute-indicator.json'
    const dir = electronApp.getPath('userData')
    this.filePath = path.join(dir, file)
    this._data = {}
    this._load()
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8')
      this._data = JSON.parse(raw) || {}
    } catch (_) {
      this._data = {}
    }
  }

  _save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this._data))
    } catch (_) {}
  }

  _getByPath(key) {
    if (!key || key === '.') return this._data
    const parts = String(key).split('.')
    let cur = this._data
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object' || !(p in cur)) return undefined
      cur = cur[p]
    }
    return cur
  }

  _setByPath(key, value) {
    const parts = String(key).split('.')
    let cur = this._data
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i]
      if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {}
      cur = cur[p]
    }
    cur[parts[parts.length - 1]] = value
  }

  read(key, defaultValue = undefined) {
    const val = this._getByPath(key)
    return typeof val === 'undefined' ? defaultValue : val
  }

  write(key, value) {
    this._setByPath(key, value)
    this._save()
    return value
  }
}

module.exports = AppStorage
