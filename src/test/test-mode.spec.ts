import { isTestModeEnabled } from './test-mode'

describe('isTestModeEnabled', () => {
  it('is enabled only with the flag set to true and NODE_ENV test', () => {
    expect(isTestModeEnabled({ E2E_TEST_MODE: 'true', NODE_ENV: 'test' })).toBe(
      true,
    )
  })

  it.each([undefined, '', 'production', 'Production', 'prod', 'development'])(
    'is disabled when the flag is true and NODE_ENV is %p',
    (nodeEnv) => {
      expect(
        isTestModeEnabled({ E2E_TEST_MODE: 'true', NODE_ENV: nodeEnv }),
      ).toBe(false)
    },
  )

  it.each([undefined, '', 'false', '1', 'TRUE'])(
    'is disabled when NODE_ENV is test and the flag is %p',
    (flag) => {
      expect(isTestModeEnabled({ E2E_TEST_MODE: flag, NODE_ENV: 'test' })).toBe(
        false,
      )
    },
  )

  it('is disabled when nothing is set', () => {
    expect(isTestModeEnabled({})).toBe(false)
  })
})
