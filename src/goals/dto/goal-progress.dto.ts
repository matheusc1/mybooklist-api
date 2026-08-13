import { ApiProperty } from '@nestjs/swagger'

export class GoalProgressDto {
  @ApiProperty()
  year: number

  @ApiProperty({ nullable: true })
  target: number | null

  @ApiProperty()
  current: number
}
