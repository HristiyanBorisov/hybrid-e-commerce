import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { API_KEY_HEADER } from '../auth/guards/api-key.guard.js';
import { internalApiConfig } from '../config/internal-api.config.js';
import { OrderSyncMessageDto } from './dto/order-sync-message.dto.js';
import { StockLevelSyncMessageDto } from './dto/stock-level-sync-message.dto.js';

/**
 * Sends orders and stock levels to the admin service's internal API. PUT with the whole record, so repeating a
 * call changes nothing. Any failure throws, so the queued job is retried.
 */
@Injectable()
export class AdminSyncClient {
  constructor(
    @Inject(internalApiConfig.KEY)
    private readonly config: ConfigType<typeof internalApiConfig>,
  ) {}

  putOrder(order: OrderSyncMessageDto): Promise<void> {
    return this.put(`/sync/orders/${order.id}`, order);
  }

  putStockLevel(stockLevel: StockLevelSyncMessageDto): Promise<void> {
    return this.put(`/sync/stock-levels/${stockLevel.productId}`, stockLevel);
  }

  private async put(path: string, body: object): Promise<void> {
    const response = await fetch(`${this.config.adminServiceUrl}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        [API_KEY_HEADER]: this.config.apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(
        `The admin service answered ${response.status} to PUT ${path}`,
      );
    }
  }
}
