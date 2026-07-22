import { Body, Controller, Get, Post } from '@nestjs/common'
import { GoalsService } from './goals.service'
import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import type { User } from '@/users/users.types'
import { UpsertGoalDto } from './dto/upsert-goal.dto'

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  async find(@CurrentUser() user: User) {
    return this.goalsService.findWithProgress(user.id)
  }

  @Post()
  async upsert(@Body() dto: UpsertGoalDto, @CurrentUser() user: User) {
    return this.goalsService.upsert(user.id, dto.target)
  }
}
