import { Controller, Get } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import type { User } from '@/users/users.types'

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@CurrentUser() user: User) {
    return this.dashboardService.getDashboard(user.id)
  }
}
