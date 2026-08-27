import { Module } from '@nestjs/common'
import { UsersService } from './users.service'
import { DatabaseModule } from '@/database/database.module'
import { UsersController } from './users.controller'
import { DrizzleUsersRepository } from './users.drizzle-repository'
import { UsersRepository } from './users.repository'

@Module({
  imports: [DatabaseModule],
  providers: [
    UsersService,
    DrizzleUsersRepository,
    { provide: UsersRepository, useExisting: DrizzleUsersRepository },
  ],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
