import { AuthModule } from '@/auth/auth.module'
import { UsersModule } from '@/users/users.module'
import { Module } from '@nestjs/common'
import { TestController } from './test.controller'
import { DatabaseModule } from '@/database/database.module'

@Module({
  imports: [UsersModule, AuthModule, DatabaseModule],
  controllers: [TestController],
})
export class TestModule {}
