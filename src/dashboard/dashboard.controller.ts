import { Controller, Get } from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiCookieAuth,
} from '@nestjs/swagger'
import { DashboardService } from './dashboard.service'
import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import type { User } from '@/users/users.types'
import { DashboardDto } from './dto/dashboard.dto'

@ApiTags('dashboard')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'User not authenticated.' })
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({
    summary: "Get the user's dashboard overview",
    description:
      'Composes currently reading, recent activity, last completed books, and weekly reading stats.',
  })
  @ApiOkResponse({ type: DashboardDto })
  @Get()
  async getDashboard(@CurrentUser() user: User) {
    return this.dashboardService.getDashboard(user.id)
  }
}
