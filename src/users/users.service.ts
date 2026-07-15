import { Inject, Injectable } from '@nestjs/common'
import { DATABASE_CONNECTION } from '@/database/database-connection'
import type { Database } from '@/database/types'
import { users } from '@/database/schema/users.schema'

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async findById(id: string) {
    return this.db.query.users.findFirst({
      where: { id },
    })
  }

  async findByProviderId(providerId: string) {
    return this.db.query.users.findFirst({
      where: { providerId },
    })
  }

  async create(data: typeof users.$inferInsert) {
    const [user] = await this.db
      .insert(users)
      .values(data)
      .onConflictDoNothing({ target: users.providerId })
      .returning()

    if (user) return user

    return this.findByProviderId(data.providerId)
  }
}
