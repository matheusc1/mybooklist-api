import { UnauthorizedException } from '@nestjs/common'
import { OAuthExceptionFilter } from './oauth-exception.filter'

describe('OAuthExceptionFilter', () => {
  afterEach(() => {
    delete process.env.FRONTEND_URL
  })

  it('redirects OAuth failures to the configured login page', () => {
    process.env.FRONTEND_URL = 'https://app.example.com'
    const response = { redirect: jest.fn() }
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    }
    const filter = new OAuthExceptionFilter()

    filter.catch(new UnauthorizedException('OAuth failed'), host as never)

    expect(response.redirect).toHaveBeenCalledWith(
      'https://app.example.com/login?error=oauth_failed',
    )
  })

  it('uses the local frontend URL when none is configured', () => {
    const response = { redirect: jest.fn() }
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    }

    new OAuthExceptionFilter().catch(new UnauthorizedException(), host as never)

    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/login?error=oauth_failed',
    )
  })
})
