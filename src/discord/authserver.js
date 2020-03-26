const express = require('express')
const greenlock = require('greenlock-express')

const REDIRECT_PATH = 'auth-redirect'

class AuthServer {

  constructor(port) {
    this.port = port
    this.isStarted = false
    this.expressApp = null
  }

  start() {
    if (this.isStarted) {
      return
    }

    this.expressApp = express()
    this.expressApp
      .get(`/${REDIRECT_PATH}`, (req, res) => {
        res.end('foo')
      })

    greenlock.init({
      packageRoot: `${__dirname}/../../`,
      configDir: '../../greenlock.d',
      maintainerEmail: 'nelsonmonterroso@gmail.com',
      cluster: false,
    }).serve(this.expressApp)

    // http.createServer((req, res) => {
    //   if (!this.isAuthRedirect(req)) {
    //     res.writeHead(404)
    //     res.end()
    //     return
    //   }
    //
    //   // take in the token
    //   res.writeHead(200)
    //   res.end()
    // }).listen(this.port)
    this.isStarted = true
  }

  getFullRedirectUri() {
    let uri = 'https://127.0.0.1'
    if (this.port !== 80) {
      uri += `:${this.port}`
    }

    return `${uri}/${REDIRECT_PATH}`
  }

  isAuthRedirect(req) {
    return req.url === `/${REDIRECT_PATH}`
  }
}

module.exports = AuthServer
