/* eslint-disable @typescript-eslint/no-unsafe-argument */
import request from 'supertest'
import { JwtService } from '@nestjs/jwt'
import type { INestApplication } from '@nestjs/common'
import { createE2eApp, deleteUser, seedUser } from './e2e-test-utils'
import type { Database } from '@/database/database.types'
import type { User } from '@/users/users.types'

describe('Authentication and protected routes (e2e)', () => {
  let app: INestApplication
  let database: Database
  let user: User
  let token: string

  beforeAll(async () => {
    const setup = await createE2eApp()
    app = setup.app
    database = setup.database
    user = await seedUser(app, 'auth')
    token = app.get(JwtService).sign({ sub: user.id })
  })

  afterAll(async () => {
    if (user) await deleteUser(database, user.id)
    await app?.close()
  })

  it('rejects an unauthenticated request to a protected route', async () => {
    await request(app.getHttpServer()).get('/books').expect(401)
  })

  it('rejects an invalid authentication cookie', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', 'access_token=invalid-token')
      .expect(401)
  })

  it('returns the authenticated user without internal fields', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', `access_token=${token}`)
      .expect(200)

    expect(response.body).toEqual({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: null,
      readingSpeed: 60,
    })
    expect(response.body).not.toHaveProperty('provider')
    expect(response.body).not.toHaveProperty('providerId')
  })

  it('allows public logout and clears the access-token cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .expect(200)

    expect(response.body).toEqual({ message: 'Logged out successfully' })
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^access_token=;/) as string,
      ]),
    )
  })
})
