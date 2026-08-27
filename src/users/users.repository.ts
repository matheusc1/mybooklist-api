import type { NewUser, User } from './users.types'

export abstract class UsersRepository {
  abstract findById(id: string): Promise<User | undefined>
  abstract findByProvider(
    provider: 'google' | 'github',
    providerId: string,
  ): Promise<User | undefined>
  abstract create(data: NewUser): Promise<User>
  abstract update(id: string, data: Partial<NewUser>): Promise<User>
}
