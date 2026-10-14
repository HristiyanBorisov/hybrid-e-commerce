import {
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { MockInstance } from 'vitest';
import { internalApiConfig } from '../config/internal-api.config.js';
import { AdminCatalogClient } from './admin-catalog.client.js';

const PRODUCT_ID = '0199e3a0-0000-7000-8000-000000000010';

describe('AdminCatalogClient', () => {
  const client = new AdminCatalogClient({
    apiKey: 'the-shared-api-key',
    adminServiceUrl: 'http://nginx:8081/internal/v1',
    timeoutMs: 5000,
  } as ConfigType<typeof internalApiConfig>);

  const product = {
    categoryId: '0199e3a0-0000-7000-8000-000000000001',
    sku: 'LMP-1',
    name: 'Desk Lamp',
    priceCents: 2990,
  };
  const savedProduct = { ...product, id: PRODUCT_ID, version: 1 };

  let fetchMock: MockInstance<typeof fetch>;
  let logError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch');
    logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function answer(status: number, body: unknown): void {
    fetchMock.mockResolvedValueOnce(Response.json(body, { status }));
  }

  it('creates the product in the admin service with the API key and the request id', async () => {
    answer(201, savedProduct);

    await expect(client.createProduct(product, 'trace-123')).resolves.toEqual(
      savedProduct,
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://nginx:8081/internal/v1/products');
    expect(init).toMatchObject({
      method: 'POST',
      body: JSON.stringify(product),
      headers: {
        'x-api-key': 'the-shared-api-key',
        'x-request-id': 'trace-123',
      },
    });
  });

  it('replaces a product with PUT', async () => {
    answer(200, savedProduct);

    await client.updateProduct(PRODUCT_ID, product, 'trace-123');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`http://nginx:8081/internal/v1/products/${PRODUCT_ID}`);
    expect(init?.method).toBe('PUT');
  });

  it("passes the admin service's validation errors on as a 422", async () => {
    answer(422, {
      message: 'The sku has already been taken.',
      errors: { sku: ['The sku has already been taken.'] },
    });

    const error = await client
      .createProduct(product, 'trace-123')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect((error as UnprocessableEntityException).getResponse()).toEqual({
      message: 'Validation failed',
      errors: { sku: ['The sku has already been taken.'] },
    });
  });

  it('answers an unknown product with 404', async () => {
    answer(404, { message: 'Not Found' });

    await expect(
      client.updateProduct(PRODUCT_ID, product, 'trace-123'),
    ).rejects.toThrow(new NotFoundException('Product not found'));
  });

  it('answers 503 and logs the status when the admin service fails', async () => {
    answer(500, { message: 'Server Error' });

    await expect(client.createProduct(product, 'trace-123')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(logError).toHaveBeenCalledWith('The admin service answered 500');
  });

  it("answers 503 when the admin service can't be reached in time", async () => {
    fetchMock.mockRejectedValueOnce(
      new DOMException('The operation timed out.', 'TimeoutError'),
    );

    await expect(client.createProduct(product, 'trace-123')).rejects.toThrow(
      new ServiceUnavailableException(
        'The catalog service is unavailable, please try again later',
      ),
    );
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining("The admin service can't be reached"),
    );
  });
});
