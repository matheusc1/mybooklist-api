import { Module } from '@nestjs/common'
import { DatabaseModule } from './database/database.module'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerGuard, ThrottlerModule, minutes } from '@nestjs/throttler'
import { UsersModule } from './users/users.module'
import { AuthModule } from './auth/auth.module'
import { APP_GUARD } from '@nestjs/core'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { BooksModule } from './books/books.module'
import { GoalsModule } from './goals/goals.module'
import { ReadingSessionsModule } from './reading-sessions/reading-sessions.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { ActivityModule } from './activity/activity.module'
import { HealthModule } from './health/health.module'
import { TestModule } from './test/test.module'
import { BookDetailsModule } from './book-details/book-details.module'
import { YearlyOverviewModule } from './yearly-overview/yearly-overview.module'
import { isTestModeEnabled } from './test/test-mode'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: minutes(1), limit: 100 }],
      // The E2E suite sends many requests from a single IP.
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    BooksModule,
    GoalsModule,
    ReadingSessionsModule,
    BookDetailsModule,
    DashboardModule,
    ActivityModule,
    YearlyOverviewModule,
    HealthModule,
    ...(isTestModeEnabled() ? [TestModule] : []),
  ],
  providers: [
    // Global guards run in this order: the rate limit comes first, so a
    // throttled request never reaches the JWT strategy and its database lookup.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
