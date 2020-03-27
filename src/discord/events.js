const discord = require('discord-rpc')

const connectRetry = 5000

const CONNECT_FAILURE = {
  NOT_RUNNING: 1,
  UNKNOWN: 2,
}

class Events {
  constructor(clientId, accessToken) {
    this.accessToken = accessToken
    this.client = null
    this.clientId = clientId
  }

  connect() {
    return new Promise(
      ((resolve, reject) => {
        this
          .tryConnect(resolve, reject)
          .catch((error) => {
            if (error !== CONNECT_FAILURE.NOT_RUNNING) {
              reject(error)
              return
            }

            const intervalTimeout = setInterval(() => {
              this.tryConnect(resolve, reject, intervalTimeout)
            }, connectRetry)
        })
      }))
      .then(() => { this.login() })
  }

  tryConnect(resolve, reject, intervalTimeout = null) {
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
          // avoid an extra param by using this as a flag indicating that we're doing a start-up connect attempt
          if (intervalTimeout !== null) {
            // not a `reject()` because then the `connect` `Promise` will fail
            throw CONNECT_FAILURE.NOT_RUNNING
          }

          return
        }

        console.error(e)
        reject(CONNECT_FAILURE.UNKNOWN)
      })
  }

  login() {
    return this.client.authenticate(this.accessToken)
  }

  onReady = () => {
    console.log('ready')
  }
}

module.exports = Events