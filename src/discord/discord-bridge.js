const EventEmitter = require('events')
const discord = require('discord-rpc')

const events = require('./events')

const connectRetry = 5000

const CONNECT_FAILURE = {
  NOT_RUNNING: 1,
  UNKNOWN: 2,
}

class DiscordBridge extends EventEmitter {
  constructor(clientId) {
    super()
    this.accessToken = null
    this.client = null
    this.clientId = clientId
    this.userState = {
      inChannel: false,
      isMuted: false,
      isTalking: false,
    }
  }

  withAccessToken(accessToken) {
    this.accessToken = accessToken
    return this
  }

  // todo: handle reconnect when discord closes/reopens
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
      .then(() => { return this.login() })
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

  emitActiveMuted() {
    if (this.userState.inChannel && this.userState.isMuted) {
      this.emit(events.SHOW_MUTE_INDICATOR, true)
    } else {
      this.emit(events.SHOW_MUTE_INDICATOR, false)
    }
  }

  onReady = () => {
    // subscribtions reacting to the user using discord
    this.client.subscribe(
      'VOICE_CHANNEL_SELECT',
      ({ channel_id }) => {
        this.userState.inChannel = channel_id !== null
        this.emitActiveMuted()
      }
    )

    this.client.subscribe(
      'VOICE_SETTINGS_UPDATE',
      ({ mute }) => {
        this.userState.isMuted = mute;
        this.emitActiveMuted()
      }
    )

    // initial state setting
    this.client.getVoiceSettings()
      .then(({ mute }) => {
        this.userState.isMuted = mute
        this.emitActiveMuted()
      })

    // this command seems to succeed when the user is _not_ in a channel
    // if they _are_ in a channel then this request never completes
    // if that's the case then the lib seems to be stuck waiting for this command to complete
    // this.client.request('GET_SELECTED_VOICE_CHANNEL')
    //   .then((channelId) => {
    //     this.userState.inChannel = channelId !== null
    //     this.emitActiveMuted()
    //   })
  }
}

module.exports = DiscordBridge