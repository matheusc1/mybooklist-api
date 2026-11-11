import {
  Controller,
  Get,
  ServiceUnavailableException,
  Inject,
} from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { sql } from 'drizzle-orm'
import { DATABASE_CONNECTION } from '@/database/database-connection'
import type { Database } from '@/database/database.types'
import { Public } from '@/auth/decorators/public.decorator'

// Hosting probes and uptime monitors call this route often, and a 429 here
// could make the platform mark the service as unhealthy.
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get()
  @Public()
  async check() {
    try {
      await this.db.execute(sql`select 1`)

      return {
        status: 'ok',
        database: 'ok',
      }
    } catch (error) {
      console.error('Health check failed:', error)

      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unavailable',
      })
    }
  }
}
