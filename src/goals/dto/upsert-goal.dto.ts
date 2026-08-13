import { ApiProperty } from '@nestjs/swagger'
import { IsInt, Min } from 'class-validator'

export class UpsertGoalDto {
  @ApiProperty({ minimum: 1, example: 50 })
  @IsInt()
  @Min(1)
  target: number
}
