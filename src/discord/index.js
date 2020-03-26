const API_ROOT = 'https://discordapp.com/api'

class Discord {

  constructor(authWindow) {
    this.authWindow = authWindow
  }

  auth() {
    this.authWindow.show()
  }
}

module.exports = Discord