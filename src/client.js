const { app } = require('electron')
const Discord = require('./discord')
const AuthWindow = require('./discord/authwindow')
const env = require('./env')

app.whenReady().then(() => {
  const authWindow = new AuthWindow(env.clientId, env.authRedirectUri)
  new Discord(authWindow).auth()
})
