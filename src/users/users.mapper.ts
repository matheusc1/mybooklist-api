import type { PublicUserDto } from './dto/public-user.dto'
import type { User } from './users.types'

export function toPublicUser(user: User): PublicUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    readingSpeed: user.readingSpeed,
  }
}
