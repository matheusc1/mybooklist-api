import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { DATABASE_CONNECTION } from './database-connection'
import { relations } from './relations'

@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const pool = new Pool({
          connectionString: configService.getOrThrow<string>('DATABASE_URL'),
        })
        return drizzle({ client: pool, relations })
      },
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
