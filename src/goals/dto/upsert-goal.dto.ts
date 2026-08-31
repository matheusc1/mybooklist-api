import { ApiProperty } from '@nestjs/swagger'
import { IsInt, Min } from 'class-validator'

export class UpsertGoalDto {
  @ApiProperty({
    description: 'Total number of books to complete in the current year.',
    minimum: 1,
    example: 50,
  })
  @IsInt()
  @Min(1)
  target: number
}
