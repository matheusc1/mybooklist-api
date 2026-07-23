import { IsInt, IsPositive } from 'class-validator'

export class UpdateReadingSpeedDto {
  @IsInt()
  @IsPositive()
  readingSpeed: number
}
