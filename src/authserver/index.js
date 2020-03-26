const express = require('express')
const fetch = require('node-fetch')
const { URLSearchParams } = require('url')
const fs = require('fs')

const env = require('../env')

const app = express()
const template = fs.readFileSync(`${__dirname}/auth-redirect.html`, 'utf8')
const redirectPathRegex = /.*\/(.*)/
const redirectPath = env.authRedirectUri.match(redirectPathRegex)[1]

function exchangeCodeForToken(code) {
  const params = new URLSearchParams()
  params.append('client_id', env.clientId)
  params.append('client_secret', env.clientSecret)
  params.append('redirect_uri', env.authRedirectUri)
  params.append('grant_type', 'authorization_code')
  params.append('code', code)

  return fetch('https://discordapp.com/api/oauth2/token', { method: 'POST', body: params })
    .then(res => res.json())
}

app.get(`/${redirectPath}`, (req, res) => {
  if (!req.query.code) {
    res.status(400).send('Missing code')
  } else {
    exchangeCodeForToken(req.query.code)
      .then((accessToken) => {
        const contents = template.replace('!ACCESS_TOKEN_PLACEHOLDER!', JSON.stringify(accessToken))
        res.send(contents)
      })
      .catch((err) => {
        res.status(500).send()
      })
  }
})

app.listen(env.authServerPort, () => console.log(`listening on port ${env.authServerPort}`))
