/* eslint-disable @typescript-eslint/no-unsafe-argument */
import request from 'supertest'
import { eq } from 'drizzle-orm'
import { JwtService } from '@nestjs/jwt'
import type { INestApplication } from '@nestjs/common'
import { createE2eApp, deleteUser, seedUser } from './e2e-test-utils'
import { books } from '@/database/schema/books.schema'
import type { Database } from '@/database/database.types'
import type { User } from '@/users/users.types'

type BookBody = {
  id: string
  currentPage: number
  status: string
  completedAt: string | null
}

type SessionBody = { id: string; durationSeconds: number }

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

describe('Book and reading-session rules (e2e)', () => {
  let app: INestApplication
  let database: Database
  let user: User
  let cookie: string

  const http = () => request(app.getHttpServer())

  const createBook = async (overrides: Record<string, unknown> = {}) => {
    const response = await http()
      .post('/books')
      .set('Cookie', cookie)
      .send({
        title: 'Rules Book',
        author: 'Author',
        genre: 'Fantasy',
        totalPages: 100,
        status: 'planned',
        ...overrides,
      })
      .expect(201)
    return response.body as BookBody
  }

  const getBook = async (id: string) => {
    const response = await http()
      .get(`/books/${id}`)
      .set('Cookie', cookie)
      .expect(200)
    return response.body as BookBody
  }

  const createSession = async (body: Record<string, unknown>) => {
    const response = await http()
      .post('/reading-sessions')
      .set('Cookie', cookie)
      .send(body)
      .expect(201)
    return response.body as SessionBody
  }

  const getSession = async (id: string) => {
    const response = await http()
      .get(`/reading-sessions/${id}`)
      .set('Cookie', cookie)
      .expect(200)
    return response.body as SessionBody
  }

  beforeAll(async () => {
    const setup = await createE2eApp()
    app = setup.app
    database = setup.database
    user = await seedUser(app, 'book-rules')
    cookie = `access_token=${app.get(JwtService).sign({ sub: user.id })}`
  })

  afterAll(async () => {
    if (user) await deleteUser(database, user.id)
    await app?.close()
  })

  describe('request validation', () => {
    it.each([
      {
        label: 'an explicit null currentPage',
        overrides: { currentPage: null },
      },
      { label: 'an empty title', overrides: { title: '' } },
      { label: 'a whitespace-only author', overrides: { author: '   ' } },
      {
        label: 'a full timestamp as startedAt',
        overrides: { startedAt: '2026-08-31T10:00:00Z' },
      },
      {
        label: 'an impossible calendar date as completedAt',
        overrides: { completedAt: '2026-02-31' },
      },
    ])('rejects creating a book with $label', async ({ overrides }) => {
      await http()
        .post('/books')
        .set('Cookie', cookie)
        .send({
          title: 'Invalid',
          author: 'Author',
          genre: 'Fantasy',
          totalPages: 100,
          status: 'planned',
          ...overrides,
        })
        .expect(400)
    })

    it.each([
      'title',
      'author',
      'genre',
      'totalPages',
      'currentPage',
      'status',
    ])('rejects a null %s when updating a book', async (field) => {
      const book = await createBook()

      await http()
        .patch(`/books/${book.id}`)
        .set('Cookie', cookie)
        .send({ [field]: null })
        .expect(400)
    })

    it('rejects an invalid resetToPlanned value', async () => {
      const book = await createBook()
      const session = await createSession({
        bookId: book.id,
        fromPage: 1,
        toPage: 5,
      })

      await http()
        .delete(`/reading-sessions/${session.id}`)
        .query({ resetToPlanned: 'typo' })
        .set('Cookie', cookie)
        .expect(400)
    })

    it.each([
      { label: 'an impossible readAt', body: { readAt: '2026-02-31' } },
      { label: 'a null readAt', body: { readAt: null } },
    ])('rejects creating a session with $label', async ({ body }) => {
      const book = await createBook()

      await http()
        .post('/reading-sessions')
        .set('Cookie', cookie)
        .send({ bookId: book.id, fromPage: 1, toPage: 5, ...body })
        .expect(400)
    })

    it.each(['fromPage', 'toPage', 'readAt'])(
      'rejects a null %s when updating a session',
      async (field) => {
        const book = await createBook()
        const session = await createSession({
          bookId: book.id,
          fromPage: 1,
          toPage: 5,
        })

        await http()
          .patch(`/reading-sessions/${session.id}`)
          .set('Cookie', cookie)
          .send({ [field]: null })
          .expect(400)
      },
    )
  })

  describe('completedAt coherence', () => {
    it('drops completedAt when a book is created as planned', async () => {
      const book = await createBook({
        status: 'planned',
        completedAt: '2024-02-01',
      })

      expect(book.completedAt).toBeNull()
    })

    it('dates a book created as completed without a date', async () => {
      const book = await createBook({ status: 'completed' })

      expect(book.completedAt).toMatch(DATE_ONLY)
    })

    it('clears completedAt when a completed book is edited to another status', async () => {
      const book = await createBook({ status: 'completed' })
      expect(book.completedAt).toMatch(DATE_ONLY)

      await http()
        .patch(`/books/${book.id}`)
        .set('Cookie', cookie)
        .send({ status: 'reading' })
        .expect(200)

      await expect(getBook(book.id)).resolves.toMatchObject({
        status: 'reading',
        completedAt: null,
      })
    })

    it('rejects a completion date before the start date', async () => {
      const book = await createBook()

      await http()
        .patch(`/books/${book.id}`)
        .set('Cookie', cookie)
        .send({
          status: 'completed',
          startedAt: '2024-03-01',
          completedAt: '2024-02-01',
        })
        .expect(400)
    })

    it('reopens a completed book when its session is shortened', async () => {
      const book = await createBook()
      const session = await createSession({
        bookId: book.id,
        fromPage: 1,
        toPage: 100,
      })
      await expect(getBook(book.id)).resolves.toMatchObject({
        status: 'completed',
      })

      await http()
        .patch(`/reading-sessions/${session.id}`)
        .set('Cookie', cookie)
        .send({ toPage: 50 })
        .expect(200)

      await expect(getBook(book.id)).resolves.toMatchObject({
        currentPage: 50,
        status: 'reading',
        completedAt: null,
      })
    })
  })

  describe('session duration', () => {
    it('keeps the stored duration when only the date changes', async () => {
      const book = await createBook()
      const session = await createSession({
        bookId: book.id,
        fromPage: 1,
        toPage: 10,
      })
      await expect(getSession(session.id)).resolves.toMatchObject({
        durationSeconds: 600,
      })

      await http()
        .patch('/users/reading-speed')
        .set('Cookie', cookie)
        .send({ readingSpeed: 120 })
        .expect(200)

      await http()
        .patch(`/reading-sessions/${session.id}`)
        .set('Cookie', cookie)
        .send({ readAt: '2024-01-01' })
        .expect(200)
      await expect(getSession(session.id)).resolves.toMatchObject({
        durationSeconds: 600,
      })

      await http()
        .patch(`/reading-sessions/${session.id}`)
        .set('Cookie', cookie)
        .send({ toPage: 20 })
        .expect(200)
      await expect(getSession(session.id)).resolves.toMatchObject({
        durationSeconds: 2400,
      })
    })
  })

  describe('page count invariant', () => {
    it('limits the synced progress when the total was lowered below an older session', async () => {
      const book = await createBook({ totalPages: 100 })
      await createSession({
        bookId: book.id,
        fromPage: 1,
        toPage: 90,
        readAt: '2024-01-01',
      })
      const latest = await createSession({
        bookId: book.id,
        fromPage: 1,
        toPage: 50,
        readAt: '2024-01-02',
      })
      await expect(getBook(book.id)).resolves.toMatchObject({ currentPage: 50 })

      await http()
        .patch(`/books/${book.id}`)
        .set('Cookie', cookie)
        .send({ totalPages: 60 })
        .expect(200)

      await http()
        .delete(`/reading-sessions/${latest.id}`)
        .set('Cookie', cookie)
        .expect(204)

      await expect(getBook(book.id)).resolves.toMatchObject({
        currentPage: 60,
        status: 'completed',
      })
    })

    it('rejects a current page above the total at the database level', async () => {
      const book = await createBook({ totalPages: 100 })

      await expect(
        database
          .update(books)
          .set({ currentPage: 101 })
          .where(eq(books.id, book.id)),
      ).rejects.toThrow()
    })
  })
})
