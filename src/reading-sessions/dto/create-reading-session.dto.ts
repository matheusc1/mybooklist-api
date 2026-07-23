import { IsUUID, IsInt, Min } from 'class-validator'

export class CreateReadingSessionDto {
  @IsUUID()
  bookId: string

  @IsInt()
  @Min(0)
  fromPage: number

  @IsInt()
  @Min(0)
  toPage: number
}
