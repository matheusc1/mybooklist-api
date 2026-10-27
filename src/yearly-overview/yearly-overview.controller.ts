import { Controller, Get, Param } from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import type { User } from '@/users/users.types'
import { GetYearlyOverviewDto } from './dto/get-yearly-overview.dto'
import { YearlyOverviewDto } from './dto/yearly-overview.dto'
import { YearlyOverviewService } from './yearly-overview.service'

@ApiTags('yearly-overview')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'User not authenticated.' })
@Controller('yearly-overview')
export class YearlyOverviewController {
  constructor(private readonly yearlyOverviewService: YearlyOverviewService) {}

  @ApiOperation({
    summary: 'Get the yearly reading overview',
    description:
      'Composes the reading goal, yearly reading stats, and the books completed in the given year.',
  })
  @ApiOkResponse({ type: YearlyOverviewDto })
  @ApiBadRequestResponse({ description: 'year must be a four-digit integer.' })
  @Get(':year')
  async getYearlyOverview(
    @CurrentUser() user: User,
    @Param() params: GetYearlyOverviewDto,
  ) {
    return this.yearlyOverviewService.getYearlyOverview(user.id, params.year)
  }
}
