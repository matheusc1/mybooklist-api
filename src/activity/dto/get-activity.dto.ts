import { ApiProperty } from '@nestjs/swagger'
import { IsString, Matches } from 'class-validator'

export class GetActivityDto {
  @ApiProperty({ pattern: '^\\d{4}-\\d{2}$', example: '2026-08' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month: string
}
