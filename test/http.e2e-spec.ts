/* eslint-disable @typescript-eslint/no-unsafe-argument */
import request from 'supertest'
import type { INestApplication } from '@nestjs/common'
import { createE2eApp, E2E_FRONTEND_URL } from './e2e-test-utils'

describe('HTTP configuration (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const setup = await createE2eApp()
    app = setup.app
  })

  afterAll(async () => {
    await app?.close()
  })

  it('reports a healthy database without authentication', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200)

    expect(response.body).toEqual({ status: 'ok', database: 'ok' })
  })

  it('allows credentialed requests from the frontend origin', async () => {
    const response = await request(app.getHttpServer())
      .options('/books')
      .set('Origin', E2E_FRONTEND_URL)
      .set('Access-Control-Request-Method', 'GET')

    expect(response.headers['access-control-allow-origin']).toBe(
      E2E_FRONTEND_URL,
    )
    expect(response.headers['access-control-allow-credentials']).toBe('true')
  })

  it('never reflects an unknown origin', async () => {
    const response = await request(app.getHttpServer())
      .options('/books')
      .set('Origin', 'https://unknown.example')
      .set('Access-Control-Request-Method', 'GET')

    expect(response.headers['access-control-allow-origin']).not.toBe(
      'https://unknown.example',
    )
  })
})
