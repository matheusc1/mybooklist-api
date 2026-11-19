import { deriveProgress, type BookProgressState } from './book-progress'

const TODAY = '2024-06-15'

const book = (
  overrides: Partial<BookProgressState> = {},
): BookProgressState => ({
  totalPages: 300,
  status: 'reading',
  startedAt: '2024-01-02',
  completedAt: null,
  ...overrides,
})

describe('deriveProgress', () => {
  it('completes the book at its final page and dates the completion today', () => {
    expect(deriveProgress(book(), 300, TODAY)).toEqual({
      currentPage: 300,
      status: 'completed',
      startedAt: '2024-01-02',
      completedAt: TODAY,
    })
  })

  it('keeps an existing completion date', () => {
    const completed = book({ status: 'completed', completedAt: '2024-02-01' })

    expect(deriveProgress(completed, 300, TODAY)).toMatchObject({
      status: 'completed',
      completedAt: '2024-02-01',
    })
  })

  it('treats progress beyond the last page as completed', () => {
    expect(deriveProgress(book(), 301, TODAY)).toMatchObject({
      status: 'completed',
      completedAt: TODAY,
    })
  })

  it('fills both dates when a planned book is finished in one session', () => {
    const planned = book({ status: 'planned', startedAt: null })

    expect(deriveProgress(planned, 300, TODAY)).toEqual({
      currentPage: 300,
      status: 'completed',
      startedAt: TODAY,
      completedAt: TODAY,
    })
  })

  it('moves a planned book to reading and fills startedAt', () => {
    const planned = book({ status: 'planned', startedAt: null })

    expect(deriveProgress(planned, 100, TODAY)).toEqual({
      currentPage: 100,
      status: 'reading',
      startedAt: TODAY,
      completedAt: null,
    })
  })

  it('keeps startedAt when it is already set', () => {
    expect(deriveProgress(book(), 100, TODAY).startedAt).toBe('2024-01-02')
  })

  it.each(['planned', 'paused', 'dropped', 'completed'] as const)(
    'sets a %s book to reading on partial progress and clears completedAt',
    (status) => {
      const current = book({
        status,
        completedAt: status === 'completed' ? '2024-02-01' : null,
      })

      expect(deriveProgress(current, 100, TODAY)).toMatchObject({
        status: 'reading',
        completedAt: null,
      })
    },
  )

  it('sends a completed book back to planned at zero progress', () => {
    const completed = book({ status: 'completed', completedAt: '2024-02-01' })

    expect(deriveProgress(completed, 0, TODAY)).toEqual({
      currentPage: 0,
      status: 'planned',
      startedAt: '2024-01-02',
      completedAt: null,
    })
  })

  it('limits the progress to the total pages when the total was lowered', () => {
    expect(deriveProgress(book({ totalPages: 100 }), 200, TODAY)).toMatchObject(
      {
        currentPage: 100,
        status: 'completed',
      },
    )
  })

  it.each(['planned', 'paused', 'dropped'] as const)(
    'keeps a %s book as it is at zero progress',
    (status) => {
      expect(deriveProgress(book({ status }), 0, TODAY)).toEqual({
        currentPage: 0,
        status,
        startedAt: '2024-01-02',
        completedAt: null,
      })
    },
  )
})
