import { PartialType, PickType } from '@nestjs/swagger'
import { CreateReadingSessionDto } from './create-reading-session.dto'

export class UpdateReadingSessionDto extends PartialType(
  PickType(CreateReadingSessionDto, ['fromPage', 'toPage', 'readAt'] as const),
) {}
