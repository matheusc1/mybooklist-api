import type { Goal } from './goals.types'

export abstract class GoalsRepository {
  abstract find(userId: string, year: number): Promise<Goal | undefined>

  abstract upsert(userId: string, year: number, target: number): Promise<void>
}
