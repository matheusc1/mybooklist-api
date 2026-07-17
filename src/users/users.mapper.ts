import type { User } from './users.types'

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    readingSpeed: user.readingSpeed,
  }
}
