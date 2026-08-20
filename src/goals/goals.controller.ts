import { Body, Controller, Get, Post } from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
} from '@nestjs/swagger'
import { GoalsService } from './goals.service'
import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import type { User } from '@/users/users.types'
import { UpsertGoalDto } from './dto/upsert-goal.dto'
import { GoalProgressDto } from './dto/goal-progress.dto'

@ApiTags('goals')
@ApiUnauthorizedResponse({ description: 'User not authenticated.' })
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @ApiOperation({ summary: "Get the current year's reading goal and progress" })
  @ApiOkResponse({ type: GoalProgressDto })
  @Get()
  async find(@CurrentUser() user: User) {
    return this.goalsService.findWithProgress(user.id)
  }

  @ApiOperation({ summary: 'Create or update the current year reading goal' })
  @ApiOkResponse({ type: GoalProgressDto })
  @ApiBadRequestResponse({ description: 'Invalid target.' })
  @Post()
  async upsert(@Body() dto: UpsertGoalDto, @CurrentUser() user: User) {
    return this.goalsService.upsert(user.id, dto.target)
  }
}
