import { PartialType, PickType } from '@nestjs/mapped-types'
import { CreateReadingSessionDto } from './create-reading-session.dto'

export class UpdateReadingSessionDto extends PartialType(
  PickType(CreateReadingSessionDto, ['fromPage', 'toPage'] as const),
) {}
