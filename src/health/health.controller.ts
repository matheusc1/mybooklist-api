import {
  Controller,
  Get,
  ServiceUnavailableException,
  Inject,
} from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { DATABASE_CONNECTION } from '@/database/database-connection'
import type { Database } from '@/database/database.types'
import { Public } from '@/auth/decorators/public.decorator'

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
