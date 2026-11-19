import type { Book } from './books.types'

export type BookProgressState = Pick<
  Book,
  'totalPages' | 'status' | 'startedAt' | 'completedAt'
>

function deriveStatus(
  book: BookProgressState,
  currentPage: number,
  completed: boolean,
): Book['status'] {
  if (completed) return 'completed'
  if (currentPage > 0) return 'reading'
  // No pages read: a completed book goes back to planned, other statuses stay.
  return book.status === 'completed' ? 'planned' : book.status
}

// Recalculates status and dates from the progress (ADR 003). A pure function,
// so the rules can be tested without a database. `today` comes from the caller.
export function deriveProgress(
  book: BookProgressState,
  currentPage: number,
  today: string,
) {
  const completed = currentPage >= book.totalPages
  const status = deriveStatus(book, currentPage, completed)
  const startedAt =
    (status === 'reading' || completed) && !book.startedAt
      ? today
      : book.startedAt
  const completedAt = completed ? (book.completedAt ?? today) : null

  return {
    currentPage: Math.min(currentPage, book.totalPages),
    status,
    startedAt,
    completedAt,
  }
}
