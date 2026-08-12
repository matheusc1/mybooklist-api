import { Controller, Patch, Body } from '@nestjs/common'
import { UsersService } from './users.service'
import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import { UpdateReadingSpeedDto } from './dto/update-reading-speed.dto'
import type { User } from './users.types'
import { toPublicUser } from './users.mapper'
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger'
import { PublicUserDto } from './dto/public-user.dto'

@ApiTags('users')
@ApiUnauthorizedResponse({ description: 'User not authenticated.' })
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: "Update the user's reading speed" })
  @ApiOkResponse({ type: PublicUserDto })
  @ApiBadRequestResponse({ description: 'Invalid readingSpeed.' })
  @Patch('reading-speed')
  async updateReadingSpeed(
    @CurrentUser() user: User,
    @Body() dto: UpdateReadingSpeedDto,
  ) {
    const updated = await this.usersService.update(user.id, dto)
    return toPublicUser(updated)
  }
}
