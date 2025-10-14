const { app } = require('electron')
const { AuthWindow, END_STATES } = require('./discord/auth-window')
const DiscordBridge = require('./discord/discord-bridge')
const MuteIndicator = require('./ui/mute-indicator')

const env = require('./env')
const fetch = require('node-fetch')
const { URLSearchParams } = require('url')
const AppStorage = require('./app-storage')

app.whenReady().then(() => {
  const storage = new AppStorage(app)
  const bridge = new DiscordBridge(env.clientId)
  const muteIndicator = new MuteIndicator(bridge, storage)

  muteIndicator.init()

  const fmtExpiry = (expiresAt) => {
    if (!expiresAt) return 'unknown'
    const msLeft = expiresAt - Date.now()
    const mins = Math.max(0, Math.floor(msLeft / 60000))
    const when = new Date(expiresAt).toLocaleString()
    return `${when} (in ${mins}m)`
  }

  const loadCreds = () => {
    const parsed = storage.read('credentials', null)
    console.log(`Loaded cached credentials from: ${storage.filePath}`)
    if (parsed && parsed.expires_at) {
      console.log(`Loaded cached credentials. Expires: ${fmtExpiry(parsed.expires_at)}`)
    }
    return parsed
  }

  const saveCreds = (payload) => {
    const enriched = Object.assign({}, payload)
    if (payload && payload.expires_in && !payload.expires_at) {
      enriched.expires_at = Date.now() + (payload.expires_in * 1000)
    }
    storage.write('credentials', enriched)
    console.log(`Saved credentials to: ${storage.filePath}`)
    if (enriched.expires_at) {
      console.log(`Saved credentials. Expires: ${fmtExpiry(enriched.expires_at)}`)
    }
    return enriched
  }

  const tryRefresh = async (refreshToken) => {
    const params = new URLSearchParams()
    params.append('client_id', env.clientId)
    params.append('client_secret', env.clientSecret)
    params.append('grant_type', 'refresh_token')
    params.append('refresh_token', refreshToken)
    const res = await fetch('https://discordapp.com/api/oauth2/token', { method: 'POST', body: params })
    const body = await res.json()
    if (!body || !body.access_token) throw new Error('refresh_failed')
    return saveCreds(body)
  }

  (async () => {
    const cached = env.useCachedCredentials ? loadCreds() : null
    const now = Date.now()

    if (cached && cached.access_token) {
      const stillValid = cached.expires_at && (cached.expires_at - 60000) > now
      if (stillValid) {
        bridge.withAccessToken(cached.access_token)
        bridge.connect()
        return
      }

      if (cached.refresh_token) {
        try {
          const refreshed = await tryRefresh(cached.refresh_token)
          bridge.withAccessToken(refreshed.access_token)
          bridge.connect()
          return
        } catch (_) { /* fallthrough to full auth */ }
      }
    }

    new AuthWindow(env.clientId, env.authRedirectUri)
      .auth()
      .catch((endState) => {
        console.error(endState)
      })
      .then((payload) => {
        const stored = saveCreds(payload)
        return bridge.withAccessToken(stored.access_token)
      })
      .then(() => { bridge.connect() })
  })()
})
