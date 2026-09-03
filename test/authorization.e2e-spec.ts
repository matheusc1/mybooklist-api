/* eslint-disable @typescript-eslint/no-unsafe-argument */
import request from 'supertest'
import { JwtService } from '@nestjs/jwt'
import type { INestApplication } from '@nestjs/common'
import { createE2eApp, deleteUser, seedUser } from './e2e-test-utils'
import type { Database } from '@/database/database.types'
import type { User } from '@/users/users.types'

describe('Resource authorization and not-found behavior (e2e)', () => {
  let app: INestApplication
  let database: Database
  let owner: User
  let otherUser: User
  let ownerCookie: string
  let otherCookie: string
  let bookId: string
  let sessionId: string

  const missingBookId = '00000000-0000-4000-8000-000000000001'
  const missingSessionId = '00000000-0000-4000-8000-000000000002'

  beforeAll(async () => {
    const setup = await createE2eApp()
    app = setup.app
    database = setup.database
    owner = await seedUser(app, 'authorization-owner')
    otherUser = await seedUser(app, 'authorization-other')
    ownerCookie = `access_token=${app.get(JwtService).sign({ sub: owner.id })}`
    otherCookie = `access_token=${app
      .get(JwtService)
      .sign({ sub: otherUser.id })}`

    const book = await request(app.getHttpServer())
      .post('/books')
      .set('Cookie', ownerCookie)
      .send({
        title: 'Authorization Book',
        author: 'Author',
        genre: 'Fantasy',
        totalPages: 100,
        status: 'planned',
      })
      .expect(201)
    bookId = (book.body as { id: string }).id

    const session = await request(app.getHttpServer())
      .post('/reading-sessions')
      .set('Cookie', ownerCookie)
      .send({ bookId, fromPage: 1, toPage: 5 })
      .expect(201)
    sessionId = (session.body as { id: string }).id
  })

  afterAll(async () => {
    if (owner) await deleteUser(database, owner.id)
    if (otherUser) await deleteUser(database, otherUser.id)
    await app?.close()
  })

  it('rejects another user from updating or deleting a book', async () => {
    await request(app.getHttpServer())
      .patch(`/books/${bookId}`)
      .set('Cookie', otherCookie)
      .send({ title: 'Unauthorized update' })
      .expect(404)

    await request(app.getHttpServer())
      .delete(`/books/${bookId}`)
      .set('Cookie', otherCookie)
      .expect(404)
  })

  it('rejects another user from updating or deleting a reading session', async () => {
    await request(app.getHttpServer())
      .patch(`/reading-sessions/${sessionId}`)
      .set('Cookie', otherCookie)
      .send({ toPage: 6 })
      .expect(404)

    await request(app.getHttpServer())
      .delete(`/reading-sessions/${sessionId}`)
      .set('Cookie', otherCookie)
      .expect(404)
  })

  it('returns 404 for missing book GET, PATCH, and DELETE requests', async () => {
    await request(app.getHttpServer())
      .get(`/books/${missingBookId}`)
      .set('Cookie', ownerCookie)
      .expect(404)

    await request(app.getHttpServer())
      .patch(`/books/${missingBookId}`)
      .set('Cookie', ownerCookie)
      .send({ title: 'Missing' })
      .expect(404)

    await request(app.getHttpServer())
      .delete(`/books/${missingBookId}`)
      .set('Cookie', ownerCookie)
      .expect(404)
  })

  it('returns 404 for missing reading-session GET, PATCH, and DELETE requests', async () => {
    await request(app.getHttpServer())
      .get(`/reading-sessions/${missingSessionId}`)
      .set('Cookie', ownerCookie)
      .expect(404)

    await request(app.getHttpServer())
      .patch(`/reading-sessions/${missingSessionId}`)
      .set('Cookie', ownerCookie)
      .send({ toPage: 2 })
      .expect(404)

    await request(app.getHttpServer())
      .delete(`/reading-sessions/${missingSessionId}`)
      .set('Cookie', ownerCookie)
      .expect(404)
  })
})
