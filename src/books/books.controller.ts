import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { BooksService } from './books.service'
import type { CreateBookDto } from './dto/create-book.dto'
import type { UpdateBookDto } from './dto/update-book.dto'
import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import type { User } from '@/users/users.types'

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  async findBooks(@CurrentUser() user: User) {
    return this.booksService.findAll(user.id)
  }

  @Get(':id')
  async findBook(@Param('id') id: string, @CurrentUser() user: User) {
    return this.booksService.findOne(id, user.id)
  }

  @Post()
  async createBook(
    @Body() createBookDto: CreateBookDto,
    @CurrentUser() user: User,
  ) {
    return this.booksService.createBook({
      ...createBookDto,
      userId: user.id,
    })
  }

  @Put(':id')
  async updateBook(
    @Param('id') id: string,
    @Body() updateBookDto: UpdateBookDto,
    @CurrentUser() user: User,
  ) {
    return this.booksService.updateBook(id, user.id, updateBookDto)
  }

  @Delete(':id')
  async deleteBook(@Param('id') id: string, @CurrentUser() user: User) {
    return this.booksService.deleteBook(id, user.id)
  }
}
