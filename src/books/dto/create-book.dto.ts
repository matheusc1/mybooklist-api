import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
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
  @ApiProperty()
  @IsString()
  title: string

  @ApiProperty()
  @IsString()
  author: string

  @ApiProperty()
  @IsString()
  genre: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  coverUrl?: string

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @IsPositive()
  totalPages: number

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  currentPage: number

  @ApiProperty({ enum: statusEnum.enumValues })
  @IsEnum(statusEnum.enumValues)
  status: (typeof statusEnum.enumValues)[number]

  @ApiPropertyOptional({ minimum: 0, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  rating?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startedAt?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedAt?: string
}
