const { app } = require('electron')
const { AuthWindow, END_STATES } = require('./discord/auth-window')
const DiscordBridge = require('./discord/discord-bridge')
const MuteIndicator = require('./ui/mute-indicator')

const env = require('./env')

app.whenReady().then(() => {
  const bridge = new DiscordBridge(env.clientId)
  const muteIndicator = new MuteIndicator(bridge)

  muteIndicator.init()

  // TODO: read cached credentials
  new AuthWindow(env.clientId, env.authRedirectUri)
    .auth()
    .catch((endState) => {
      console.error(endState)
    })
    .then((payload) => {
      // TODO: store payload somewhere?
      return bridge.withAccessToken(payload.access_token)
    })
    .then(() => { return bridge.connect() })
})
