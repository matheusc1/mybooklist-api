import { Injectable } from '@nestjs/common'
import type { NewUser, User } from './users.types'
import { UsersRepository } from './users.repository'

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async findById(id: string): Promise<User | undefined> {
    return this.repository.findById(id)
  }

  async findByProvider(
    provider: 'google' | 'github',
    providerId: string,
  ): Promise<User | undefined> {
    return this.repository.findByProvider(provider, providerId)
  }

  async create(data: NewUser): Promise<User> {
    return this.repository.create(data)
  }

  async update(id: string, data: Partial<NewUser>): Promise<User> {
    return this.repository.update(id, data)
  }
}
