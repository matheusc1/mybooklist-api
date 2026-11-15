import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DATABASE_CONNECTION } from '@/database/database-connection'
import type { Database } from '@/database/database.types'
import { users } from '@/database/schema/users.schema'
import type { NewUser, User } from './users.types'
import { UsersRepository } from './users.repository'

@Injectable()
export class DrizzleUsersRepository extends UsersRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {
    super()
  }

  findById(id: string) {
    return this.db.query.users.findFirst({ where: { id } })
  }

  findByProvider(provider: 'google' | 'github', providerId: string) {
    return this.db.query.users.findFirst({ where: { provider, providerId } })
  }

  async create(data: NewUser): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(data)
      .onConflictDoUpdate({
        target: [users.provider, users.providerId],
        set: {
          email: data.email,
          name: data.name,
          avatarUrl: data.avatarUrl,
        },
      })
      .returning()
    return user
  }

  async update(id: string, data: Pick<NewUser, 'readingSpeed'>): Promise<User> {
    const [updated] = await this.db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning()
    if (!updated) throw new NotFoundException(`User with id ${id} not found`)
    return updated
  }
}
