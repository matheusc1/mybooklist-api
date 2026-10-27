import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, Max, Min } from 'class-validator'

export class GetYearlyOverviewDto {
  @ApiProperty({
    description: 'Four-digit year to summarize.',
    minimum: 1000,
    maximum: 9999,
    example: 2026,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(9999)
  year: number
}
