import { Module } from '@nestjs/common'
import { DatabaseModule } from './database/database.module'
import { ConfigModule } from '@nestjs/config'
import { UsersModule } from './users/users.module'
import { AuthModule } from './auth/auth.module'
import { APP_GUARD } from '@nestjs/core'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { BooksModule } from './books/books.module'
import { GoalsModule } from './goals/goals.module'
import { ReadingSessionsModule } from './reading-sessions/reading-sessions.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { ActivityModule } from './activity/activity.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    BooksModule,
    GoalsModule,
    ReadingSessionsModule,
    DashboardModule,
    ActivityModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
