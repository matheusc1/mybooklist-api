import { toPublicUser } from './users.mapper'
import type { User } from './users.types'

describe('toPublicUser', () => {
  const user: User = {
    id: 'user-123',
    provider: 'google',
    providerId: 'google-123',
    email: 'user@example.com',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.png',
    readingSpeed: 90,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  }

  it('maps only the public fields', () => {
    expect(toPublicUser(user)).toEqual({
      id: 'user-123',
      email: 'user@example.com',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
      readingSpeed: 90,
    })
  })

  it('does not leak internal auth fields', () => {
    const result = toPublicUser(user)

    expect(result).not.toHaveProperty('provider')
    expect(result).not.toHaveProperty('providerId')
    expect(result).not.toHaveProperty('createdAt')
  })
})
