import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  UnauthorizedException,
} from '@nestjs/common'
import type { Response } from 'express'

@Catch(UnauthorizedException)
export class OAuthExceptionFilter implements ExceptionFilter {
  catch(_exception: UnauthorizedException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
    response.redirect(`${frontendUrl}/login?error=oauth_failed`)
  }
}
