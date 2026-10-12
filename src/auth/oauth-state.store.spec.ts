import { CookieStateStore } from './oauth-state.store'

type Res = { cookie: jest.Mock; clearCookie: jest.Mock }

const makeReq = (cookies?: Record<string, string>) => {
  const res: Res = { cookie: jest.fn(), clearCookie: jest.fn() }
  return { req: { cookies, res } as never, res }
}

const meta = { authorizationURL: 'a', tokenURL: 't', clientID: 'c' }

describe('CookieStateStore', () => {
  afterEach(() => {
    delete process.env.NODE_ENV
  })

  describe('store', () => {
    it('sets a scoped httpOnly cookie and returns the same state', () => {
      const { req, res } = makeReq()
      let state = ''
      const done = jest.fn((_err: Error | null, generated?: string) => {
        state = generated ?? ''
      })

      new CookieStateStore('google').store(req, done)

      expect(done).toHaveBeenCalledWith(null, expect.any(String))
      expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/)
      expect(res.cookie).toHaveBeenCalledWith(
        'oauth_state_google',
        state,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/auth',
          maxAge: 10 * 60 * 1000,
          secure: false,
        }),
      )
    })

    it('marks the cookie secure in production', () => {
      process.env.NODE_ENV = 'production'
      const { req, res } = makeReq()

      new CookieStateStore('github').store(req, jest.fn())

      expect(res.cookie).toHaveBeenCalledWith(
        'oauth_state_github',
        expect.any(String),
        expect.objectContaining({ secure: true }),
      )
    })

    it('generates a different state for each attempt', () => {
      const store = new CookieStateStore('google')
      const states = new Set<string>()

      for (let i = 0; i < 20; i++) {
        store.store(makeReq().req, (_err, generated) => {
          states.add(generated ?? '')
        })
      }

      expect(states.size).toBe(20)
    })

    it('supports the call shape that passes metadata', () => {
      const { req, res } = makeReq()
      const done = jest.fn()

      new CookieStateStore('google').store(req, meta as never, done)

      expect(done).toHaveBeenCalledWith(null, expect.any(String))
      expect(res.cookie).toHaveBeenCalledTimes(1)
    })

    it('throws when no callback is provided', () => {
      expect(() =>
        (new CookieStateStore('google').store as (...a: unknown[]) => void)(
          makeReq().req,
          meta,
        ),
      ).toThrow('Missing OAuth state store callback.')
    })
  })

  describe('verify', () => {
    it('accepts a matching state and clears the cookie', () => {
      const { req, res } = makeReq({ oauth_state_google: 'abc123' })
      const done = jest.fn()

      new CookieStateStore('google').verify(req, 'abc123', done)

      expect(done).toHaveBeenCalledWith(null, true, 'abc123')
      expect(res.clearCookie).toHaveBeenCalledWith(
        'oauth_state_google',
        expect.objectContaining({ path: '/auth', httpOnly: true }),
      )
    })

    it('rejects a mismatched state and still clears the cookie', () => {
      const { req, res } = makeReq({ oauth_state_google: 'abc123' })
      const done = jest.fn()

      new CookieStateStore('google').verify(req, 'abc124', done)

      expect(done).toHaveBeenCalledWith(null, false, '')
      expect(res.clearCookie).toHaveBeenCalledTimes(1)
    })

    it('rejects a state of a different length', () => {
      const { req } = makeReq({ oauth_state_google: 'abc123' })
      const done = jest.fn()

      new CookieStateStore('google').verify(req, 'abc', done)

      expect(done).toHaveBeenCalledWith(null, false, '')
    })

    it('rejects when the state cookie is missing', () => {
      const { req } = makeReq({})
      const done = jest.fn()

      new CookieStateStore('google').verify(req, 'abc123', done)

      expect(done).toHaveBeenCalledWith(null, false, '')
    })

    it('rejects when cookies were not parsed at all', () => {
      const { req } = makeReq(undefined)
      const done = jest.fn()

      new CookieStateStore('google').verify(req, 'abc123', done)

      expect(done).toHaveBeenCalledWith(null, false, '')
    })

    it('rejects a missing state without throwing', () => {
      const { req } = makeReq({ oauth_state_google: 'abc123' })
      const done = jest.fn()

      expect(() =>
        new CookieStateStore('google').verify(
          req,
          undefined as unknown as string,
          done,
        ),
      ).not.toThrow()
      expect(done).toHaveBeenCalledWith(null, false, '')
    })

    it('rejects a state that is not a string', () => {
      const { req } = makeReq({ oauth_state_google: 'abc123' })
      const done = jest.fn()

      new CookieStateStore('google').verify(
        req,
        ['abc123'] as unknown as string,
        done,
      )

      expect(done).toHaveBeenCalledWith(null, false, '')
    })

    it('does not accept the cookie of another provider', () => {
      const { req } = makeReq({ oauth_state_github: 'abc123' })
      const done = jest.fn()

      new CookieStateStore('google').verify(req, 'abc123', done)

      expect(done).toHaveBeenCalledWith(null, false, '')
    })

    it('supports the call shape that passes metadata', () => {
      const { req } = makeReq({ oauth_state_google: 'abc123' })
      const done = jest.fn()

      new CookieStateStore('google').verify(req, 'abc123', meta as never, done)

      expect(done).toHaveBeenCalledWith(null, true, 'abc123')
    })

    it('throws when no callback is provided', () => {
      expect(() =>
        (new CookieStateStore('google').verify as (...a: unknown[]) => void)(
          makeReq().req,
          'abc',
          meta,
        ),
      ).toThrow('Missing OAuth state verification callback.')
    })
  })

  it('keeps the arity passport-oauth2 uses to choose the call shape', () => {
    // passport-oauth2 reads `.length`: 3 => store(req, meta, cb),
    // 4 => verify(req, state, meta, cb). Changing these changes the call.
    const store = new CookieStateStore('google')
    expect(store.store.length).toBe(3)
    expect(store.verify.length).toBe(4)
  })
})
