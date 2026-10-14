import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import type { Response } from 'express'

@Catch()
export class OAuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(OAuthExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'

    // Expected failures (cancel, no email, bad state) are not worth a log line.
    if (!(exception instanceof UnauthorizedException)) {
      // Provider errors (TokenError, AuthorizationError) often have no message,
      // so the class name is what makes the log line useful.
      const error = exception instanceof Error ? exception : undefined
      const name = error?.name ?? 'UnknownError'
      const detail = error?.message ? `: ${error.message}` : ''

      this.logger.error(`${name}${detail}`, error?.stack)
    }

    response.redirect(`${frontendUrl}/login?error=oauth_failed`)
  }
}
