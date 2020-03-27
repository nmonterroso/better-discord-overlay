const { app } = require('electron')
const { AuthWindow, END_STATES } = require('./discord/auth-window')
const DiscordEventListener = require('./discord/event-listener')

const env = require('./env')

app.whenReady().then(() => {
  new AuthWindow(env.clientId, env.authRedirectUri)
    .auth()
    .catch((endState) => {
      console.error(endState)
    })
    .then((payload) => {
      // TODO: store payload somewhere?
      return new DiscordEventListener(payload.access_token)
    })
    .then((eventListener) => {
      eventListener.start()
    })
})
