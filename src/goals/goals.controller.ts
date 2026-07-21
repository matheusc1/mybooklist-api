import { Body, Controller, Get, Post } from '@nestjs/common'
import { GoalsService } from './goals.service'
import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import type { User } from '@/users/users.types'
import type { UpsertGoalDto } from './dto/upsert-goal.dto'

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  async findGoal(@CurrentUser() user: User) {
    return this.goalsService.findGoal(user.id)
  }

  @Post()
  async upsertGoal(@Body() dto: UpsertGoalDto, @CurrentUser() user: User) {
    return this.goalsService.upsertGoal(user.id, dto.target)
  }
}
