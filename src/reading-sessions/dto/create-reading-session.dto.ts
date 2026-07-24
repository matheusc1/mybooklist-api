import { IsUUID, IsInt, Min, IsOptional, IsDateString } from 'class-validator'

export class CreateReadingSessionDto {
  @IsUUID()
  bookId: string

  @IsInt()
  @Min(0)
  fromPage: number

  @IsInt()
  @Min(0)
  toPage: number

  @IsOptional()
  @IsDateString()
  readAt?: string
}
