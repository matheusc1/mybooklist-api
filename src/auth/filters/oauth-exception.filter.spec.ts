import { Logger, UnauthorizedException } from '@nestjs/common'
import { OAuthExceptionFilter } from './oauth-exception.filter'

describe('OAuthExceptionFilter', () => {
  const makeHost = () => {
    const response = { redirect: jest.fn() }
    const host = { switchToHttp: () => ({ getResponse: () => response }) }
    return { response, host: host as never }
  }

  let logError: jest.SpyInstance

  beforeEach(() => {
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation()
  })

  afterEach(() => {
    delete process.env.FRONTEND_URL
    jest.restoreAllMocks()
  })

  it('redirects OAuth failures to the configured login page', () => {
    process.env.FRONTEND_URL = 'https://app.example.com'
    const { response, host } = makeHost()

    new OAuthExceptionFilter().catch(
      new UnauthorizedException('OAuth failed'),
      host,
    )

    expect(response.redirect).toHaveBeenCalledWith(
      'https://app.example.com/login?error=oauth_failed',
    )
  })

  it('uses the local frontend URL when none is configured', () => {
    const { response, host } = makeHost()

    new OAuthExceptionFilter().catch(new UnauthorizedException(), host)

    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/login?error=oauth_failed',
    )
  })

  it('does not log expected authorization failures', () => {
    const { host } = makeHost()

    new OAuthExceptionFilter().catch(new UnauthorizedException(), host)

    expect(logError).not.toHaveBeenCalled()
  })

  it('redirects unexpected errors to the login page and logs them', () => {
    const { response, host } = makeHost()
    const error = new Error('db down')

    new OAuthExceptionFilter().catch(error, host)

    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/login?error=oauth_failed',
    )
    expect(logError).toHaveBeenCalledWith('Error: db down', error.stack)
  })

  it('logs the error name when the provider error has no message', () => {
    const { host } = makeHost()
    const error = new Error()
    error.name = 'TokenError'
    error.message = undefined as unknown as string

    new OAuthExceptionFilter().catch(error, host)

    expect(logError).toHaveBeenCalledWith('TokenError', error.stack)
  })

  it('handles thrown values that are not errors', () => {
    const { response, host } = makeHost()

    new OAuthExceptionFilter().catch('boom', host)

    expect(response.redirect).toHaveBeenCalledTimes(1)
    expect(logError).toHaveBeenCalledWith('UnknownError', undefined)
  })
})
