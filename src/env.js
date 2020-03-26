module.exports = {
  authRedirectUri: process.env.AUTHSERVER_REDIRECT || 'https://better-discord-overlay.com/auth-redirect',
  authServerPort: parseInt(process.env.AUTHSERVER_PORT) || 80,
  clientId: '692774109402103918',
  clientSecret: process.env.CLIENT_SECRET || 'super-secret'
}