import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { DATABASE_CONNECTION } from '@/database/database-connection'
import type { Database } from '@/database/database.types'
import { users } from '@/database/schema/users.schema'
import type { NewUser, User } from './users.types'
import { eq } from 'drizzle-orm'

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async findById(id: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: { id },
    })
  }

  async findByProvider(
    provider: 'google' | 'github',
    providerId: string,
  ): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: { provider, providerId },
    })
  }

  async create(data: NewUser): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(data)
      .onConflictDoNothing({ target: [users.provider, users.providerId] })
      .returning()

    if (user) return user

    const existingUser = await this.findByProvider(
      data.provider,
      data.providerId,
    )

    if (!existingUser) {
      throw new Error('Failed to create or retrieve user')
    }

    return existingUser
  }

  async update(id: string, data: Partial<NewUser>): Promise<User> {
    const [updated] = await this.db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning()

    if (!updated) {
      throw new NotFoundException(`User with id ${id} not found`)
    }

    return updated
  }
}
