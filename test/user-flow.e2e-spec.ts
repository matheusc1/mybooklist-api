/* eslint-disable @typescript-eslint/no-unsafe-argument */
import request from 'supertest'
import { JwtService } from '@nestjs/jwt'
import type { INestApplication } from '@nestjs/common'
import { createE2eApp, deleteUser, seedUser } from './e2e-test-utils'
import type { Database } from '@/database/database.types'
import type { User } from '@/users/users.types'

describe('Cross-module reading flow (e2e)', () => {
  let app: INestApplication
  let database: Database
  let user: User
  let otherUser: User
  let cookie: string
  let bookId: string
  let sessionId: string

  beforeAll(async () => {
    const setup = await createE2eApp()
    app = setup.app
    database = setup.database
    user = await seedUser(app, 'flow-owner')
    otherUser = await seedUser(app, 'flow-other')
    const token = app.get(JwtService).sign({ sub: user.id })
    cookie = `access_token=${token}`
  })

  afterAll(async () => {
    if (user) await deleteUser(database, user.id)
    if (otherUser) await deleteUser(database, otherUser.id)
    await app?.close()
  })

  it('validates request bodies at the HTTP boundary', async () => {
    await request(app.getHttpServer())
      .post('/books')
      .set('Cookie', cookie)
      .send({
        title: 'Invalid',
        author: 'Author',
        genre: 'Fantasy',
        totalPages: 100,
        status: 'planned',
        unexpected: true,
      })
      .expect(400)
  })

  it('rejects an invalid reading goal target', async () => {
    await request(app.getHttpServer())
      .post('/goals')
      .set('Cookie', cookie)
      .send({ target: -1 })
      .expect(400)
  })

  it('rejects an invalid reading speed', async () => {
    await request(app.getHttpServer())
      .patch('/users/reading-speed')
      .set('Cookie', cookie)
      .send({ readingSpeed: 0 })
      .expect(400)
  })

  it('creates and retrieves a book for the authenticated owner', async () => {
    const response = await request(app.getHttpServer())
      .post('/books')
      .set('Cookie', cookie)
      .send({
        title: 'The Hobbit',
        author: 'J. R. R. Tolkien',
        genre: 'Fantasy',
        totalPages: 300,
        status: 'planned',
      })
      .expect(201)

    const bookBody = response.body as { id: string }
    bookId = bookBody.id
    expect(response.body).toMatchObject({
      id: bookId,
      userId: user.id,
      title: 'The Hobbit',
      currentPage: 0,
      status: 'planned',
    })

    const list = await request(app.getHttpServer())
      .get('/books')
      .set('Cookie', cookie)
      .expect(200)
    expect(list.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: bookId })]),
    )
  })

  it('rejects reversed reading-session pages', async () => {
    await request(app.getHttpServer())
      .post('/reading-sessions')
      .set('Cookie', cookie)
      .send({
        bookId,
        fromPage: 10,
        toPage: 1,
      })
      .expect(400)
  })

  it('updates a book directly and persists the changed fields', async () => {
    await request(app.getHttpServer())
      .patch(`/books/${bookId}`)
      .set('Cookie', cookie)
      .send({ title: 'The Hobbit Revised', rating: 5 })
      .expect(200)

    const response = await request(app.getHttpServer())
      .get(`/books/${bookId}`)
      .set('Cookie', cookie)
      .expect(200)
    expect(response.body).toMatchObject({
      title: 'The Hobbit Revised',
      rating: 5,
    })
  })

  it('rejects unexpected goal fields through the global validation pipe', async () => {
    await request(app.getHttpServer())
      .post('/goals')
      .set('Cookie', cookie)
      .send({ target: 10, unexpected: true })
      .expect(400)
  })

  it('prevents another user from reading the book', async () => {
    const token = app.get(JwtService).sign({ sub: otherUser.id })

    await request(app.getHttpServer())
      .get(`/books/${bookId}`)
      .set('Cookie', `access_token=${token}`)
      .expect(404)
  })

  it('updates book progress through a reading session and exposes it in aggregates', async () => {
    await request(app.getHttpServer())
      .post('/reading-sessions')
      .set('Cookie', cookie)
      .send({ bookId, fromPage: 1, toPage: 300 })
      .expect(201)
      .expect((response) => {
        sessionId = (response.body as { id: string }).id
      })

    const book = await request(app.getHttpServer())
      .get(`/books/${bookId}`)
      .set('Cookie', cookie)
      .expect(200)
    expect(book.body).toMatchObject({ currentPage: 300, status: 'completed' })

    const year = new Date().getFullYear()
    await request(app.getHttpServer())
      .post('/goals')
      .set('Cookie', cookie)
      .send({ target: 1 })
      .expect(200)

    const goal = await request(app.getHttpServer())
      .get('/goals')
      .set('Cookie', cookie)
      .expect(200)
    expect(goal.body).toMatchObject({ year, target: 1, current: 1 })

    const dashboard = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Cookie', cookie)
      .expect(200)
    const dashboardBody = dashboard.body as {
      weeklyStats: { totalPagesRead: number }
    }
    expect(dashboardBody.weeklyStats.totalPagesRead).toBe(300)

    const month = new Date().toISOString().slice(0, 7)
    const activity = await request(app.getHttpServer())
      .get('/activity')
      .query({ month })
      .set('Cookie', cookie)
      .expect(200)
    const activityBody = activity.body as {
      monthlyStats: { sessions: number; pages: number }
    }
    expect(activityBody.monthlyStats).toMatchObject({
      sessions: 1,
      pages: 300,
    })
  })

  it('updates reading speed and reflects it in the authenticated profile', async () => {
    await request(app.getHttpServer())
      .patch('/users/reading-speed')
      .set('Cookie', cookie)
      .send({ readingSpeed: 90 })
      .expect(200)

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookie)
      .expect(200)
    expect(response.body).toMatchObject({
      id: user.id,
      readingSpeed: 90,
    })
  })

  it('validates activity month format', async () => {
    await request(app.getHttpServer())
      .get('/activity')
      .query({ month: '2026-1' })
      .set('Cookie', cookie)
      .expect(400)
  })

  it('deletes the session and explicitly resets the book progress', async () => {
    await request(app.getHttpServer())
      .delete(`/reading-sessions/${sessionId}`)
      .query({ resetToPlanned: 'true' })
      .set('Cookie', cookie)
      .expect(204)

    const book = await request(app.getHttpServer())
      .get(`/books/${bookId}`)
      .set('Cookie', cookie)
      .expect(200)
    expect(book.body).toMatchObject({ currentPage: 0, status: 'planned' })

    await request(app.getHttpServer())
      .delete(`/books/${bookId}`)
      .set('Cookie', cookie)
      .expect(204)
  })
})
