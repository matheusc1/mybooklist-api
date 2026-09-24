import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator'

export class CreateAndLoginDto {
  @IsString()
  suffix: string

  @IsInt()
  @IsPositive()
  @IsOptional()
  readingSpeed?: number | null
}
