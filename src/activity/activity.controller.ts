import { Controller, Get, Query } from '@nestjs/common'
import { ActivityService } from './activity.service'
import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import type { User } from '@/users/users.types'
import { GetActivityDto } from './dto/get-activity.dto'

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  async getActivity(@CurrentUser() user: User, @Query() query: GetActivityDto) {
    return this.activityService.getActivity(user.id, query.month)
  }
}
