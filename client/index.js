const { app } = require('electron')
const Discord = require('./discord')
const AuthServer = require('./discord/authserver')
const AuthWindow = require('./discord/authwindow')

const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET
const authServerPort = parseInt(process.env.AUTHSERVER_PORT) || 80

app.whenReady().then(() => {
  const authServer = new AuthServer(authServerPort)
  const authWindow = new AuthWindow(clientId, authServer.getFullRedirectUri())
  new Discord(authServer, authWindow).auth()
})
