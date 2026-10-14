import type { ConfigType } from '@nestjs/config';
import type { MockInstance } from 'vitest';
import { internalApiConfig } from '../config/internal-api.config.js';
import { AdminSyncClient } from './admin-sync.client.js';

describe('AdminSyncClient', () => {
  const client = new AdminSyncClient({
    apiKey: 'the-shared-api-key',
    adminServiceUrl: 'http://nginx:8081/internal/v1',
    timeoutMs: 5000,
  } as ConfigType<typeof internalApiConfig>);

  let fetchMock: MockInstance<typeof fetch>;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('PUTs an order with the API key', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await client.putOrder({ id: 'order-1' } as never);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://nginx:8081/internal/v1/sync/orders/order-1');
    expect(init).toMatchObject({
      method: 'PUT',
      body: JSON.stringify({ id: 'order-1' }),
      headers: { 'x-api-key': 'the-shared-api-key' },
    });
  });

  it('PUTs a stock level under its product id', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await client.putStockLevel({
      productId: 'lamp-id',
      quantity: 7,
      version: 4,
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://nginx:8081/internal/v1/sync/stock-levels/lamp-id',
    );
  });

  it('throws when the admin service refuses, so the job is retried', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));

    await expect(
      client.putStockLevel({ productId: 'lamp-id', quantity: 7, version: 4 }),
    ).rejects.toThrow(
      'The admin service answered 503 to PUT /sync/stock-levels/lamp-id',
    );
  });
});
