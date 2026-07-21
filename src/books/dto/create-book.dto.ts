import {
  IsString,
  IsInt,
  IsPositive,
  IsOptional,
  IsUrl,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from 'class-validator'
import { statusEnum } from '@/database/schema/books.schema'

export class CreateBookDto {
  @IsString()
  title: string

  @IsString()
  author: string

  @IsOptional()
  @IsUrl()
  coverUrl?: string

  @IsInt()
  @IsPositive()
  totalPages: number

  @IsEnum(statusEnum.enumValues)
  status: (typeof statusEnum.enumValues)[number]

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  rating?: number

  @IsOptional()
  @IsDateString()
  startedAt?: string

  @IsOptional()
  @IsDateString()
  finishedAt?: string
}
