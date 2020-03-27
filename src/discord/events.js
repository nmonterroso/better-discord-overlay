const discord = require('discord-rpc')

const connectRetry = 5000

const CONNECT_FAILURE = {
  NOT_RUNNING: 1,
  UNKNOWN: 2,
}

class Events {
  constructor(clientId, accessToken) {
    this.clientId = clientId
    this.accessToken = accessToken
    this.connectPromise = null
    this.client = null
  }

  connect() {
    return new Promise(((resolve, reject) => { this.tryConnect(resolve, reject, true) }))
      .catch((error) => {
        if (error !== CONNECT_FAILURE.NOT_RUNNING) {
          return Promise.reject(error)
        }

        return new Promise(((resolve, reject) => {
          const intervalTimeout = setInterval(() => {
            this.tryConnect(resolve, reject, false, intervalTimeout)
          }, connectRetry)
        }))
      })
  }

  tryConnect(resolve, reject, rejectOnNotRunning, intervalTimeout = null) {
    this.client = new discord.Client({ transport: 'ipc' })
    this.client.on('ready', this.onReady) // when connect'd

    return this.client.connect(this.clientId)
      .then(() => {
        if (intervalTimeout !== null) {
          clearInterval(intervalTimeout)
        }

        resolve()
      })
      .catch((e) => {
        if (e.message === 'Could not connect') {
          if (rejectOnNotRunning) {
            reject(CONNECT_FAILURE.NOT_RUNNING)
          }

          return
        }

        console.error(e)
        reject(CONNECT_FAILURE.UNKNOWN)
      })
  }

  onReady = () => {

  }
}

module.exports = Events