import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { Request } from 'express'
import type { Metadata } from 'passport-oauth2'

const STATE_TTL_MS = 10 * 60 * 1000

type StoreCallback = (err: Error | null, state?: string) => void

type VerifyCallback = (err: Error | null, ok: boolean, state: string) => void

export class CookieStateStore {
  constructor(private readonly provider: 'google' | 'github') {}

  private get cookieName() {
    return `oauth_state_${this.provider}`
  }

  private get cookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/auth',
    }
  }

  store(req: Request, callback: StoreCallback): void
  store(req: Request, meta: Metadata, callback: StoreCallback): void
  store(
    req: Request,
    metaOrCallback: Metadata | StoreCallback,
    callback?: StoreCallback,
  ): void {
    const done =
      typeof metaOrCallback === 'function' ? metaOrCallback : callback

    if (!done) {
      throw new Error('Missing OAuth state store callback.')
    }

    const state = randomBytes(32).toString('base64url')

    req.res?.cookie(this.cookieName, state, {
      ...this.cookieOptions,
      maxAge: STATE_TTL_MS,
    })

    done(null, state)
  }

  verify(req: Request, providedState: string, callback: VerifyCallback): void

  verify(
    req: Request,
    providedState: string,
    meta: Metadata,
    callback: VerifyCallback,
  ): void

  verify(
    req: Request,
    providedState: string,
    metaOrCallback: Metadata | VerifyCallback,
    callback?: VerifyCallback,
  ): void {
    const done =
      typeof metaOrCallback === 'function' ? metaOrCallback : callback

    if (!done) {
      throw new Error('Missing OAuth state verification callback.')
    }

    const cookies = req.cookies as Record<string, string> | undefined
    const expected = cookies?.[this.cookieName]

    // Single use: always clear, whether it matches or not.
    req.res?.clearCookie(this.cookieName, this.cookieOptions)

    const a = Buffer.from(expected ?? '')
    const state = typeof providedState === 'string' ? providedState : ''
    const b = Buffer.from(state)
    const ok = a.length > 0 && a.length === b.length && timingSafeEqual(a, b)

    done(null, ok, ok ? state : '')
  }
}
