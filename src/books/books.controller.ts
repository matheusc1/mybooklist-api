import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiCookieAuth,
} from '@nestjs/swagger'
import { BooksService } from './books.service'
import { CreateBookDto } from './dto/create-book.dto'
import { UpdateBookDto } from './dto/update-book.dto'
import { BookDto } from './dto/book.dto'
import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import type { User } from '@/users/users.types'

@ApiTags('books')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'User not authenticated.' })
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @ApiOperation({ summary: "List the user's books" })
  @ApiOkResponse({ type: BookDto, isArray: true })
  @Get()
  async findAll(@CurrentUser() user: User) {
    return this.booksService.findAll(user.id)
  }

  @ApiOperation({ summary: 'Get a book by id' })
  @ApiOkResponse({ type: BookDto })
  @ApiNotFoundResponse({ description: 'Book not found.' })
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.booksService.findOne(id, user.id)
  }

  @ApiOperation({ summary: 'Create a new book' })
  @ApiCreatedResponse({ type: BookDto })
  @ApiBadRequestResponse({
    description: 'currentPage cannot be greater than totalPages.',
  })
  @Post()
  async create(
    @Body() createBookDto: CreateBookDto,
    @CurrentUser() user: User,
  ) {
    return this.booksService.create({
      ...createBookDto,
      userId: user.id,
    })
  }

  @ApiOperation({ summary: 'Update a book' })
  @ApiOkResponse({ type: BookDto })
  @ApiNotFoundResponse({ description: 'Book not found.' })
  @ApiBadRequestResponse({
    description: 'currentPage cannot be greater than totalPages.',
  })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBookDto: UpdateBookDto,
    @CurrentUser() user: User,
  ) {
    return this.booksService.update(id, user.id, updateBookDto)
  }

  @ApiOperation({ summary: 'Delete a book' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Book not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.booksService.delete(id, user.id)
  }
}
