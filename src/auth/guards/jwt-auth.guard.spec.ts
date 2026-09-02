import { Reflector } from '@nestjs/core'
import { JwtAuthGuard } from './jwt-auth.guard'

describe('JwtAuthGuard', () => {
  it('allows handlers marked as public without invoking Passport', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    }
    const guard = new JwtAuthGuard(reflector as unknown as Reflector)
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }

    expect(guard.canActivate(context as never)).toBe(true)
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
      context.getHandler(),
      context.getClass(),
    ])
  })
})
