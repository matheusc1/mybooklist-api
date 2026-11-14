const DEVELOPMENT_FRONTEND_URL = 'http://localhost:5173'

// FRONTEND_URL drives the CORS origin and the redirects after login. In
// production a missing value must stop the app instead of silently pointing
// users at localhost. Trailing slashes are removed so that the CORS origin
// matches and "<url>/home" never contains a double slash.
export function getFrontendUrl(env: NodeJS.ProcessEnv = process.env) {
  const url = env.FRONTEND_URL?.trim().replace(/\/+$/, '')

  if (url) return url

  if (env.NODE_ENV === 'production') {
    throw new Error('FRONTEND_URL must be set in production.')
  }

  return DEVELOPMENT_FRONTEND_URL
}
