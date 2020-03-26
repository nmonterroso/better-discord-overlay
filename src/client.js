const { app } = require('electron')
const Discord = require('./discord')
const AuthWindow = require('./discord/authwindow')

const clientId = '692774109402103918'
const authServerRedirectUri = process.env.AUTHSERVER_REDIRECT || 'https://better-discord-overlay.com/auth-redirect';

app.whenReady().then(() => {
  const authWindow = new AuthWindow(clientId, authServerRedirectUri)
  new Discord(authWindow).auth()
})
