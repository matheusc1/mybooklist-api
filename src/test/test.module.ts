import { AuthModule } from '@/auth/auth.module'
import { UsersModule } from '@/users/users.module'
import { Module } from '@nestjs/common'
import { TestController } from './test.controller'

@Module({
  imports: [UsersModule, AuthModule],
  controllers: [TestController],
})
export class TestModule {}
