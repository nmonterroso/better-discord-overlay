const { BrowserWindow } = require('electron')

function createWindow() {
  return new BrowserWindow({
    width: 600,
    height: 750,
    center: true,
    autoHideMenuBar: true,
  })
}

const scopes = ['rpc', 'rpc.api']

const END_STATES = {
  ERROR_UNKNOWN: 1,
  AUTH_CANCELED: 2,
}

class AuthWindow {

  constructor(clientId, redirectUri) {
    this.window = null
    this.authPromise = null
    this.authComplete = false
    this.clientId = clientId
    this.redirectUri = redirectUri
  }

  auth() {
    if (this.authPromise !== null) {
      return this.authPromise
    } else if (this.window === null) {
      this.window = createWindow();
    }

    this.authPromise = new Promise(((resolve, reject) => {
      this.window.webContents.on('dom-ready', () => { this.onDomReady(resolve, reject) })
      this.window.on('close', () => { this.onClose(reject) })
    }))

    this.loadUrl()
    this.window.show()

    return this.authPromise
  }

  loadUrl() {
    this.window.loadURL(
      'https://discordapp.com/api/oauth2/authorize?'+
      'response_type=code&'+
      `client_id=${this.clientId}&`+
      `scope=${encodeURIComponent(scopes.join(' '))}&`+
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&`+
      'prompt=none' // can be consent to force user to reclick authorize button
    )
  }

  onDomReady(resolve, reject) {
    const current = this.window.webContents.history[this.window.webContents.currentIndex]
    if (current.startsWith(this.redirectUri)) {
      // TODO: check response code, if non-200 then reject(END_STATES.AUTH_CANCELED)
      this.window.webContents
        .executeJavaScript('getAccessToken()')
        .then((jsonString) => JSON.parse(jsonString))
        .then((accessToken) => {
          this.authComplete = true
          resolve(accessToken)
        })
        .catch((e) => {
          console.error(e)
          reject(END_STATES.ERROR_UNKNOWN)
        })
        .finally(() => {
          this.window.close()
        })
    }
  }

  onClose(reject) {
    if (!this.authComplete) {
      reject(END_STATES.AUTH_CANCELED)
    }
  }
}

module.exports = { AuthWindow, END_STATES }