const { app } = require('electron')
const { AuthWindow, END_STATES } = require('./discord/authwindow')
const env = require('./env')

app.whenReady().then(() => {
  new AuthWindow(env.clientId, env.authRedirectUri)
    .auth()
    .then((accessToken) => {
      console.log(accessToken)
    })
    .catch((endState) => {
      console.error(endState)
    })
})
