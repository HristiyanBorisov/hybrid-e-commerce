import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { internalApiConfig } from '../../config/internal-api.config.js';
import { ApiKeyGuard } from './api-key.guard.js';

describe('ApiKeyGuard', () => {
  const guard = new ApiKeyGuard({
    apiKey: 'the-shared-api-key',
  } as ConfigType<typeof internalApiConfig>);

  function contextWithHeader(apiKey?: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          header: (name: string) => (name === 'x-api-key' ? apiKey : undefined),
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('lets a caller with the shared API key through', () => {
    expect(guard.canActivate(contextWithHeader('the-shared-api-key'))).toBe(
      true,
    );
  });

  it.each([
    ['no key', undefined],
    ['an empty key', ''],
    ['a wrong key of the same length', 'the-shared-api-kez'],
    ['a key that only starts the same', 'the-shared'],
  ])('rejects %s with 401', (_case, apiKey) => {
    expect(() => guard.canActivate(contextWithHeader(apiKey))).toThrow(
      new UnauthorizedException('Invalid API key'),
    );
  });
});
