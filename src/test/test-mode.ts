export function isTestModeEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.E2E_TEST_MODE === 'true' && env.NODE_ENV === 'test'
}
