import { IsInt, Min } from 'class-validator'

export class UpsertGoalDto {
  @IsInt()
  @Min(1)
  target: number
}
