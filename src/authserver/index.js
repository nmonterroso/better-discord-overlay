const express = require('express')
const fs = require('fs')

const REDIRECT_PATH = 'auth-redirect'

const app = express()
const port = parseInt(process.env.AUTHSERVER_PORT) || 80
const template = fs.readFileSync(`${__dirname}/auth-redirect.html`, 'utf8')

app.get(`/${REDIRECT_PATH}`, (req, res) => {
  if (!req.query.code) {
    res.status(400).send('Missing code')
  } else {
    res.send(template.replace('!auth-redirect-code!', req.query.code))
  }
})

app.listen(port, () => console.log(`listening on port ${port}`))
