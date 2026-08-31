import { ApiProperty } from '@nestjs/swagger'

export class GoalProgressDto {
  @ApiProperty({ description: 'Reading goal year.', example: 2026 })
  year: number

  @ApiProperty({
    description: 'Reading target for the year. Null when no goal has been configured.',
    nullable: true,
    example: 50,
  })
  target: number | null

  @ApiProperty({ description: 'Books completed in the current year.', example: 12 })
  current: number
}
