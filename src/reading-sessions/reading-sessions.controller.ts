import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
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
import { ReadingSessionsService } from './reading-sessions.service'
import { CreateReadingSessionDto } from './dto/create-reading-session.dto'
import { UpdateReadingSessionDto } from './dto/update-reading-session.dto'
import { DeleteReadingSessionDto } from './dto/delete-reading-session.dto'
import { ReadingSessionDto } from './dto/reading-session.dto'
import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import type { User } from '@/users/users.types'

@ApiTags('reading-sessions')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'User not authenticated.' })
@Controller('reading-sessions')
export class ReadingSessionsController {
  constructor(
    private readonly readingSessionsService: ReadingSessionsService,
  ) {}

  @ApiOperation({ summary: "List the user's reading sessions" })
  @ApiOkResponse({ type: ReadingSessionDto, isArray: true })
  @Get()
  findAll(@CurrentUser() user: User) {
    return this.readingSessionsService.findAll(user.id)
  }

  @ApiOperation({ summary: 'Get a reading session by id' })
  @ApiOkResponse({ type: ReadingSessionDto })
  @ApiNotFoundResponse({ description: 'Reading session not found.' })
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.readingSessionsService.findOne(id, user.id)
  }

  @ApiOperation({ summary: 'Create a new reading session' })
  @ApiCreatedResponse({ type: ReadingSessionDto })
  @ApiBadRequestResponse({
    description: 'toPage must be greater than or equal to fromPage.',
  })
  @ApiNotFoundResponse({ description: 'Book not found.' })
  @Post()
  create(
    @CurrentUser() user: User,
    @Body() createReadingSessionDto: CreateReadingSessionDto,
  ) {
    return this.readingSessionsService.create(user, createReadingSessionDto)
  }

  @ApiOperation({ summary: 'Update a reading session' })
  @ApiOkResponse({ type: ReadingSessionDto })
  @ApiNotFoundResponse({ description: 'Reading session not found.' })
  @ApiBadRequestResponse({
    description: 'toPage must be greater than or equal to fromPage.',
  })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateReadingSessionDto: UpdateReadingSessionDto,
  ) {
    return this.readingSessionsService.update(id, user, updateReadingSessionDto)
  }

  @ApiOperation({ summary: 'Delete a reading session' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Reading session not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Query() query: DeleteReadingSessionDto,
  ) {
    return this.readingSessionsService.delete(id, user.id, query.resetToPlanned)
  }
}
