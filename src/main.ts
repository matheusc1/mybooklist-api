import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { getFrontendUrl } from './common/frontend-url'
import cookieParser from 'cookie-parser'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { apiReference } from '@scalar/nestjs-api-reference'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.useSecurityHeaders({ contentSecurityPolicy: false })

  // Behind the hosting proxy, req.ip is the proxy address, and every client
  // would share a single rate limit counter. The number is how many proxies
  // sit in front of the app.
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1)
  }

  app.enableShutdownHooks()
  app.use(cookieParser())
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // Throws in production when FRONTEND_URL is missing, so the app refuses to
  // start instead of allowing the wrong origin.
  app.enableCors({
    origin: getFrontendUrl(),
    credentials: true,
  })

  const config = new DocumentBuilder()
    .setTitle('MyBookList API')
    .setDescription('Personal reading tracker API')
    .setVersion('1.0')
    .addCookieAuth('access_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'access_token',
      description: 'JWT access token stored in an httpOnly cookie.',
    })
    .addTag('books', 'Book CRUD and reading progress')
    .addTag('reading-sessions', 'Reading session tracking')
    .addTag('goals', 'Annual reading goals')
    .addTag('users', 'User profile and preferences')
    .addTag('dashboard', 'Consolidated overview')
    .addTag('activity', 'Monthly activity detail')
    .addTag('auth', 'OAuth authentication')
    .build()

  const document = SwaggerModule.createDocument(app, config)
  app.use('/reference', apiReference({ content: document }))

  await app.listen(process.env.PORT ?? 3000)
}

bootstrap().catch((error) => {
  console.error('Error starting server:', error)
  process.exit(1)
})
