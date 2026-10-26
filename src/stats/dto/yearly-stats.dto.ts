import { ApiProperty } from '@nestjs/swagger'

export class YearlyStatsDto {
  @ApiProperty({
    description: 'Number of reading sessions in the selected year.',
    example: 140,
  })
  sessions: number

  @ApiProperty({
    description: 'Total pages read in the selected year.',
    example: 5200,
  })
  pages: number

  @ApiProperty({
    description: 'Total reading time in minutes for the selected year.',
    example: 3600,
  })
  readingTime: number

  @ApiProperty({
    description:
      'Number of distinct days with reading activity in the selected year.',
    example: 96,
  })
  activeDays: number

  @ApiProperty({
    description:
      'Pages read per month, ordered from January to December. Always 12 entries.',
    type: Number,
    isArray: true,
    minItems: 12,
    maxItems: 12,
    example: [320, 410, 0, 280, 500, 390, 450, 0, 610, 380, 420, 300],
  })
  pagesByMonth: number[]
}
