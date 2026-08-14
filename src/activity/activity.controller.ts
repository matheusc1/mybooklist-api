import { Controller, Get, Query } from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { ActivityService } from './activity.service'
import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import type { User } from '@/users/users.types'
import { GetActivityDto } from './dto/get-activity.dto'
import { ActivityDto } from './dto/activity.dto'

@ApiTags('activity')
@ApiUnauthorizedResponse({ description: 'User not authenticated.' })
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @ApiOperation({
    summary: 'Get monthly reading activity',
    description:
      'Returns stats and a day-by-day calendar of reading sessions for the given month.',
  })
  @ApiOkResponse({ type: ActivityDto })
  @ApiBadRequestResponse({ description: 'month must be in YYYY-MM format.' })
  @Get()
  async getActivity(@CurrentUser() user: User, @Query() query: GetActivityDto) {
    return this.activityService.getActivity(user.id, query.month)
  }
}
