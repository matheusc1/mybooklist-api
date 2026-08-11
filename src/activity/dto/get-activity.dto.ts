import { IsString, Matches } from 'class-validator'

export class GetActivityDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month: string
}
