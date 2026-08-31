import { ApiProperty } from '@nestjs/swagger'

export class MonthlyStatsDto {
  @ApiProperty({ description: 'Number of reading sessions in the selected month.', example: 12 })
  sessions: number

  @ApiProperty({ description: 'Total pages read in the selected month.', example: 520 })
  pages: number

  @ApiProperty({ description: 'Total reading time in minutes for the selected month.', example: 360 })
  readingTime: number

  @ApiProperty({ description: 'Number of distinct days with reading activity in the selected month.', example: 9 })
  activeDays: number
}
