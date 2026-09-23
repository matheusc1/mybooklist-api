import { createE2eApp } from './e2e-test-utils'

async function bootstrap() {
  const { app } = await createE2eApp()
  await app.listen(3000)
  console.log('E2E API listening on :3000')
}

bootstrap().catch((error) => {
  console.error('Error starting server:', error)
  process.exit(1)
})
