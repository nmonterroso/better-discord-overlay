const { app } = require('electron')
const { AuthWindow, END_STATES } = require('./discord/auth-window')
const Events = require('./discord/events')

const env = require('./env')

app.whenReady().then(() => {
  new AuthWindow(env.clientId, env.authRedirectUri)
    .auth()
    .catch((endState) => {
      console.error(endState)
    })
    .then((payload) => {
      // TODO: store payload somewhere?
      return new Events(env.clientId, payload.access_token)
    })
    .then((events) => {
      events.connect()
    })
})
