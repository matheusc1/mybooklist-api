import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common'
import { ReadingSessionsService } from './reading-sessions.service'
import { CreateReadingSessionDto } from './dto/create-reading-session.dto'
import { UpdateReadingSessionDto } from './dto/update-reading-session.dto'
import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import type { User } from '@/users/users.types'

@Controller('reading-sessions')
export class ReadingSessionsController {
  constructor(
    private readonly readingSessionsService: ReadingSessionsService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.readingSessionsService.findAll(user.id)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.readingSessionsService.findOne(id, user.id)
  }

  @Post()
  create(
    @CurrentUser() user: User,
    @Body() createReadingSessionDto: CreateReadingSessionDto,
  ) {
    return this.readingSessionsService.create(user, createReadingSessionDto)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateReadingSessionDto: UpdateReadingSessionDto,
  ) {
    return this.readingSessionsService.update(id, user, updateReadingSessionDto)
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.readingSessionsService.delete(id, user.id)
  }
}
