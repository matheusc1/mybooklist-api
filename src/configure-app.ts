import { ValidationPipe } from '@nestjs/common'
import type { INestApplication } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { getFrontendUrl } from '@/common/frontend-url'

export const validationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}

export function configureApp(app: INestApplication) {
  app.use(cookieParser())
  app.useGlobalPipes(new ValidationPipe(validationPipeOptions))
  app.enableCors({
    origin: getFrontendUrl(),
    credentials: true,
  })
}
