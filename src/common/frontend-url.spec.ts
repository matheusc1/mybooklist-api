import { getFrontendUrl } from './frontend-url'

describe('getFrontendUrl', () => {
  it('returns the configured URL', () => {
    expect(getFrontendUrl({ FRONTEND_URL: 'https://app.example.com' })).toBe(
      'https://app.example.com',
    )
  })

  it.each(['https://app.example.com/', 'https://app.example.com///'])(
    'removes trailing slashes from %p',
    (url) => {
      expect(getFrontendUrl({ FRONTEND_URL: url })).toBe(
        'https://app.example.com',
      )
    },
  )

  it.each([undefined, '', '   ', '/'])(
    'falls back to localhost in development when FRONTEND_URL is %p',
    (url) => {
      expect(
        getFrontendUrl({ FRONTEND_URL: url, NODE_ENV: 'development' }),
      ).toBe('http://localhost:5173')
    },
  )

  it.each(['test', undefined])(
    'falls back to localhost when NODE_ENV is %p',
    (nodeEnv) => {
      expect(getFrontendUrl({ NODE_ENV: nodeEnv })).toBe(
        'http://localhost:5173',
      )
    },
  )

  it('returns the configured URL in production', () => {
    expect(
      getFrontendUrl({
        FRONTEND_URL: 'https://app.example.com',
        NODE_ENV: 'production',
      }),
    ).toBe('https://app.example.com')
  })

  it.each([undefined, '', '   ', '/'])(
    'throws in production when FRONTEND_URL is %p',
    (url) => {
      expect(() =>
        getFrontendUrl({ FRONTEND_URL: url, NODE_ENV: 'production' }),
      ).toThrow('FRONTEND_URL must be set in production.')
    },
  )
})
