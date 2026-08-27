import type {
  NewReadingSession,
  ReadingSession,
} from './reading-sessions.types'

export abstract class ReadingSessionsRepository {
  abstract findAll(userId: string): Promise<ReadingSession[]>

  abstract findOne(
    id: string,
    userId: string,
  ): Promise<ReadingSession | undefined>

  abstract create(
    session: Omit<NewReadingSession, 'durationSeconds'>,
    durationSeconds: number,
  ): Promise<ReadingSession>

  abstract update(
    id: string,
    data: Partial<Pick<ReadingSession, 'fromPage' | 'toPage' | 'readAt'>>,
    durationSeconds: number,
  ): Promise<ReadingSession | undefined>

  abstract delete(id: string, resetToPlanned: boolean): Promise<void>
}
