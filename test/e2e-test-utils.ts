import cookieParser from 'cookie-parser'
import { ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { UsersRepository } from '@/users/users.repository'
import type { User } from '@/users/users.types'
import { DATABASE_CONNECTION } from '@/database/database-connection'
import type { Database } from '@/database/database.types'
import { users } from '@/database/schema/users.schema'
import { eq } from 'drizzle-orm'
import { AppModule } from '@/app.module'

export async function createE2eApp(): Promise<{
  app: INestApplication
  database: Database
}> {
  const databaseUrl = process.env.TEST_DATABASE_URL
  const jwtSecret = process.env.TEST_JWT_SECRET

  if (!databaseUrl || !jwtSecret) {
    throw new Error('E2E tests require TEST_DATABASE_URL and TEST_JWT_SECRET.')
  }

  process.env.DATABASE_URL = databaseUrl
  process.env.JWT_SECRET = jwtSecret
  process.env.FRONTEND_URL = 'http://localhost:5173'
  process.env.GOOGLE_CLIENT_ID = 'e2e-google-client'
  process.env.GOOGLE_CLIENT_SECRET = 'e2e-google-secret'
  process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/auth/google/callback'
  process.env.GITHUB_CLIENT_ID = 'e2e-github-client'
  process.env.GITHUB_CLIENT_SECRET = 'e2e-github-secret'
  process.env.GITHUB_CALLBACK_URL = 'http://localhost:3000/auth/github/callback'

  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()
  const app = module.createNestApplication<NestExpressApplication>()

  app.use(cookieParser())
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  await app.init()

  return { app, database: app.get<Database>(DATABASE_CONNECTION) }
}

export async function seedUser(
  app: INestApplication,
  suffix: string,
): Promise<User> {
  const repository = app.get<UsersRepository>(UsersRepository)
  return repository.create({
    provider: 'google',
    providerId: `e2e-${suffix}-${Date.now()}-${Math.random()}`,
    email: `${suffix}-${Date.now()}@example.com`,
    name: `E2E ${suffix}`,
    avatarUrl: null,
    readingSpeed: 60,
  })
}

export async function deleteUser(database: Database, userId: string) {
  await database.delete(users).where(eq(users.id, userId))
}
