import { ApiProperty } from '@nestjs/swagger'

export class PublicUserDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  email: string

  @ApiProperty()
  name: string

  @ApiProperty({ nullable: true })
  avatarUrl: string | null

  @ApiProperty({ nullable: true, example: 200 })
  readingSpeed: number | null
}
