import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { BooksService } from './books.service'
import { CreateBookDto } from './dto/create-book.dto'
import { UpdateBookDto } from './dto/update-book.dto'
import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import type { User } from '@/users/users.types'

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  async findAll(@CurrentUser() user: User) {
    return this.booksService.findAll(user.id)
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.booksService.findOne(id, user.id)
  }

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

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBookDto: UpdateBookDto,
    @CurrentUser() user: User,
  ) {
    return this.booksService.update(id, user.id, updateBookDto)
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.booksService.delete(id, user.id)
  }
}
