import { IsOptional, IsBoolean } from 'class-validator'
import { Transform } from 'class-transformer'

export class DeleteReadingSessionDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  resetToPlanned?: boolean
}
