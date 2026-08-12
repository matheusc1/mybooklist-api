import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import cookieParser from 'cookie-parser'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { apiReference } from '@scalar/nestjs-api-reference'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.enableShutdownHooks()
  app.use(cookieParser())
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  })

  const config = new DocumentBuilder()
    .setTitle('MyBookList API')
    .setDescription('Personal reading tracker API')
    .setVersion('1.0')
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
