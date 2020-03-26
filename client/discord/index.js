const API_ROOT = 'https://discordapp.com/api'

class Discord {

  constructor(authServer, authWindow) {
    this.authServer = authServer
    this.authWindow = authWindow
  }

  auth() {
    this.authServer.start()
    this.authWindow.show()
  }
}

module.exports = Discord