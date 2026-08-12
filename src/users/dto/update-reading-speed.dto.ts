import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsPositive } from 'class-validator'

export class UpdateReadingSpeedDto {
  @ApiProperty({
    description: 'Seconds spent per page, used to estimate session duration',
    example: 90,
  })
  @IsInt()
  @IsPositive()
  readingSpeed: number
}
