import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import cookieParser from 'cookie-parser'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.use(cookieParser())
  await app.listen(process.env.PORT ?? 3000)
}

bootstrap().catch((error) => {
  console.error('Error starting server:', error)
  process.exit(1)
})
