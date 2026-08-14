import { ApiProperty } from '@nestjs/swagger'

export class MonthlyStatsDto {
  @ApiProperty()
  sessions: number

  @ApiProperty()
  pages: number

  @ApiProperty()
  readingTime: number

  @ApiProperty()
  activeDays: number
}
