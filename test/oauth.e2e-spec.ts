/* eslint-disable @typescript-eslint/no-unsafe-argument */
import request, { type Response } from 'supertest'
import { Logger, type INestApplication } from '@nestjs/common'
import { createE2eApp, deleteUser } from './e2e-test-utils'
import { GoogleStrategy } from '@/auth/strategies/google.strategy'
import { GithubStrategy } from '@/auth/strategies/github.strategy'
import { UsersService } from '@/users/users.service'
import type { Database } from '@/database/database.types'

type Callback = (err: unknown, ...results: unknown[]) => void

// passport-oauth2 internals: these are the two network calls to stub.
type StrategyInternals = {
  _oauth2: {
    getOAuthAccessToken: (
      code: string,
      params: unknown,
      callback: Callback,
    ) => void
  }
  userProfile: (accessToken: string, done: Callback) => void
}

const FRONTEND = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const LOGIN_FAILED = `${FRONTEND}/login?error=oauth_failed`

describe.each([
  ['google', GoogleStrategy],
  ['github', GithubStrategy],
] as const)('OAuth %s (e2e)', (provider, StrategyClass) => {
  let app: INestApplication
  let database: Database
  let strategy: StrategyInternals
  let logError: jest.SpyInstance

  const providerId = `e2e-oauth-${provider}`
  const providerProfile = {
    provider,
    id: providerId,
    displayName: 'OAuth E2E',
    emails: [{ value: `${providerId}@example.com` }],
    photos: [],
  }

  beforeAll(async () => {
    const setup = await createE2eApp()
    app = setup.app
    database = setup.database
    strategy = app.get<unknown, StrategyInternals>(StrategyClass)
  })

  beforeEach(() => {
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  afterAll(async () => {
    const user = await app
      .get(UsersService)
      .findByProvider(provider, providerId)
    if (user) await deleteUser(database, user.id)
    await app?.close()
  })

  const stubProvider = (profile: unknown = providerProfile) => {
    jest
      .spyOn(strategy._oauth2, 'getOAuthAccessToken')
      .mockImplementation((_code, _params, callback) =>
        callback(null, 'access-token', 'refresh-token', {}),
      )
    jest
      .spyOn(strategy, 'userProfile')
      .mockImplementation((_accessToken, done) => done(null, profile))
  }

  // Starts the flow like a browser would and returns the state sent to the provider.
  const startLogin = async (agent: ReturnType<typeof request.agent>) => {
    const response = await agent.get(`/auth/${provider}`).expect(302)
    const state = new URL(response.headers.location).searchParams.get('state')
    expect(state).toBeTruthy()
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`oauth_state_${provider}=${state}`),
      ]),
    )
    return state as string
  }

  const expectLoginFailed = (response: Response) => {
    expect(response.headers.location).toBe(LOGIN_FAILED)
    expect(response.headers['set-cookie'] ?? []).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^access_token=/)]),
    )
  }

  it('completes the login, sets the session cookie and can be repeated', async () => {
    stubProvider()
    const agent = request.agent(app.getHttpServer())

    for (let attempt = 0; attempt < 2; attempt++) {
      const state = await startLogin(agent)
      const response = await agent
        .get(`/auth/${provider}/callback`)
        .query({ code: 'code', state })
        .expect(302)

      expect(response.headers.location).toBe(`${FRONTEND}/home`)
      expect(response.headers['set-cookie']).toEqual(
        expect.arrayContaining([expect.stringMatching(/^access_token=/)]),
      )
    }

    await expect(
      app.get(UsersService).findByProvider(provider, providerId),
    ).resolves.toMatchObject({ provider, providerId })
  })

  it('rejects a callback that has no state cookie', async () => {
    stubProvider()

    const response = await request(app.getHttpServer())
      .get(`/auth/${provider}/callback`)
      .query({ code: 'code', state: 'forged-state' })
      .expect(302)

    expectLoginFailed(response)
  })

  it('rejects a mismatched state', async () => {
    stubProvider()
    const agent = request.agent(app.getHttpServer())
    await startLogin(agent)

    const response = await agent
      .get(`/auth/${provider}/callback`)
      .query({ code: 'code', state: 'another-state' })
      .expect(302)

    expectLoginFailed(response)
  })

  it('rejects a callback without the state parameter', async () => {
    stubProvider()
    const agent = request.agent(app.getHttpServer())
    await startLogin(agent)

    const response = await agent
      .get(`/auth/${provider}/callback`)
      .query({ code: 'code' })
      .expect(302)

    expectLoginFailed(response)
    expect(logError).not.toHaveBeenCalled()
  })

  it('rejects a replayed callback', async () => {
    stubProvider()
    const agent = request.agent(app.getHttpServer())
    const state = await startLogin(agent)
    await agent
      .get(`/auth/${provider}/callback`)
      .query({ code: 'code', state })
      .expect(302)

    const replay = await agent
      .get(`/auth/${provider}/callback`)
      .query({ code: 'code', state })
      .expect(302)

    expectLoginFailed(replay)
  })

  it('redirects to the login page when the user cancels at the provider', async () => {
    const response = await request(app.getHttpServer())
      .get(`/auth/${provider}/callback`)
      .query({ error: 'access_denied' })
      .expect(302)

    expectLoginFailed(response)
    expect(logError).not.toHaveBeenCalled()
  })

  it('redirects to the login page when the profile has no email', async () => {
    stubProvider({ ...providerProfile, emails: [] })
    const agent = request.agent(app.getHttpServer())
    const state = await startLogin(agent)

    const response = await agent
      .get(`/auth/${provider}/callback`)
      .query({ code: 'code', state })
      .expect(302)

    expectLoginFailed(response)
  })

  it('redirects to the login page and logs when the provider returns an error', async () => {
    const response = await request(app.getHttpServer())
      .get(`/auth/${provider}/callback`)
      .query({ error: 'server_error' })
      .expect(302)

    expectLoginFailed(response)
    expect(logError).toHaveBeenCalledTimes(1)
  })

  it('redirects to the login page and logs when the token exchange fails', async () => {
    jest
      .spyOn(strategy._oauth2, 'getOAuthAccessToken')
      .mockImplementation((_code, _params, callback) =>
        callback({ statusCode: 400, data: '{"error":"invalid_grant"}' }),
      )
    const agent = request.agent(app.getHttpServer())
    const state = await startLogin(agent)

    const response = await agent
      .get(`/auth/${provider}/callback`)
      .query({ code: 'expired-code', state })
      .expect(302)

    expectLoginFailed(response)
    expect(logError).toHaveBeenCalledTimes(1)
  })

  it('redirects to the login page and logs when saving the user fails', async () => {
    stubProvider()
    jest
      .spyOn(app.get(UsersService), 'create')
      .mockRejectedValueOnce(new Error('database unavailable'))
    const agent = request.agent(app.getHttpServer())
    const state = await startLogin(agent)

    const response = await agent
      .get(`/auth/${provider}/callback`)
      .query({ code: 'code', state })
      .expect(302)

    expectLoginFailed(response)
    expect(logError).toHaveBeenCalledWith(
      'Error: database unavailable',
      expect.any(String),
    )
  })
})
