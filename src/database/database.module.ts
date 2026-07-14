import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { DATABASE_CONNECTION } from './database-connection'
import { relations } from './relations'

@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const sql = neon(configService.getOrThrow<string>('DATABASE_URL'))
        return drizzle({ client: sql, relations })
      },
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
