import { ApiProperty } from '@nestjs/swagger'
import { BookDto } from '../../books/dto/book.dto'
import { GoalProgressDto } from '../../goals/dto/goal-progress.dto'
import { YearlyStatsDto } from '../../stats/dto/yearly-stats.dto'

export class YearlyOverviewDto {
  @ApiProperty({
    type: GoalProgressDto,
    description: 'Reading goal and progress for the selected year.',
  })
  goal: GoalProgressDto

  @ApiProperty({
    type: YearlyStatsDto,
    description: 'Reading summary for the selected year.',
  })
  yearlyStats: YearlyStatsDto

  @ApiProperty({
    type: BookDto,
    isArray: true,
    description:
      'Books completed in the selected year, in chronological order.',
  })
  completedBooks: BookDto[]
}
