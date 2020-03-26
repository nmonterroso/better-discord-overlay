const { BrowserWindow } = require('electron')

class AuthWindow {

  constructor(clientId, redirectUri) {
    this.window = null
    this.clientId = clientId
    this.redirectUri = redirectUri
  }

  show() {
    if (this.window === null) {
      this.createWindow();
    }

    this.window.show()
  }

  createWindow() {
    this.window = new BrowserWindow({
      width: 600,
      height: 750,
      center: true,
      autoHideMenuBar: true,
    })

    this.window.loadURL(
      'https://discordapp.com/api/oauth2/authorize?'+
      'response_type=code&'+
      `client_id=${this.clientId}&`+
      'scope=identify&'+
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&`+
      'prompt=none'
    )

    this.window.webContents.on('dom-ready', () => {
      const current = this.window.webContents.history[this.window.webContents.currentIndex]
      if (current.startsWith(this.redirectUri)) {
        this.window.webContents
          .executeJavaScript('getAccessToken()')
          .then((jsonString) => JSON.parse(jsonString))
          .then((accessToken) => {
            console.log(accessToken)
          })
      }
    })
  }
}

module.exports = AuthWindow