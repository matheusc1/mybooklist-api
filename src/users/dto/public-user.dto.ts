import { ApiProperty } from '@nestjs/swagger'

export class PublicUserDto {
  @ApiProperty({ description: 'Unique user identifier.' })
  id: string

  @ApiProperty({ description: 'Primary email address used for the account.' })
  email: string

  @ApiProperty({ description: 'Display name from the OAuth provider profile.' })
  name: string

  @ApiProperty({
    description: 'Profile avatar URL, if available.',
    nullable: true,
    example: 'https://example.com/avatar.png',
  })
  avatarUrl: string | null

  @ApiProperty({
    description: 'Reading speed in seconds per page. Null until configured.',
    nullable: true,
    example: 200,
  })
  readingSpeed: number | null
}
