import { Controller, Get, Param } from '@nestjs/common'
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import type { User } from '@/users/users.types'
import { BookDetailsDto } from './dto/book-details.dto'
import { BookDetailsService } from './book-details.service'

@ApiTags('book-details')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'User not authenticated.' })
@Controller('book-details')
export class BookDetailsController {
  constructor(private readonly bookDetailsService: BookDetailsService) {}

  @ApiOperation({
    summary: 'Get a book with its reading sessions and statistics',
    description:
      'Returns the book, all of its reading sessions, and on-demand reading statistics. Books not owned by the authenticated user are not found.',
  })
  @ApiParam({ name: 'id', description: 'Book identifier.' })
  @ApiOkResponse({ type: BookDetailsDto })
  @ApiNotFoundResponse({ description: 'Book not found.' })
  @Get(':id')
  getBookDetails(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bookDetailsService.getBookDetails(id, user.id)
  }
}
