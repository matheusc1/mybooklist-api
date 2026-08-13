import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsBoolean } from 'class-validator'
import { Transform } from 'class-transformer'

export class DeleteReadingSessionDto {
  @ApiPropertyOptional({
    description:
      'When true and this is the last remaining session for the book, resets its progress back to planned.',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  resetToPlanned?: boolean
}
