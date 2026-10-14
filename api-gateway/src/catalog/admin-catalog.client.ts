import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { API_KEY_HEADER } from '../auth/guards/api-key.guard.js';
import { REQUEST_ID_HEADER } from '../common/middleware/request-logging.middleware.js';
import { internalApiConfig } from '../config/internal-api.config.js';
import { AdminProductDto } from './dto/admin-product.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

/**
 * Calls the admin service's internal product API. Product writes go there because the admin service
 * owns the catalog; it answers with the saved product.
 */
@Injectable()
export class AdminCatalogClient {
  private readonly logger = new Logger(AdminCatalogClient.name);

  constructor(
    @Inject(internalApiConfig.KEY)
    private readonly config: ConfigType<typeof internalApiConfig>,
  ) {}

  createProduct(
    data: CreateProductDto,
    requestId: string,
  ): Promise<AdminProductDto> {
    return this.send('POST', '/products', data, requestId);
  }

  updateProduct(
    id: string,
    data: UpdateProductDto,
    requestId: string,
  ): Promise<AdminProductDto> {
    return this.send('PUT', `/products/${id}`, data, requestId);
  }

  private async send(
    method: 'POST' | 'PUT',
    path: string,
    body: CreateProductDto,
    requestId: string,
  ): Promise<AdminProductDto> {
    const response = await this.request(method, path, body, requestId);

    if (!response.ok) {
      throw await this.toException(response);
    }

    return (await response.json()) as AdminProductDto;
  }

  private async request(
    method: 'POST' | 'PUT',
    path: string,
    body: CreateProductDto,
    requestId: string,
  ): Promise<Response> {
    try {
      return await fetch(`${this.config.adminServiceUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          [API_KEY_HEADER]: this.config.apiKey,
          [REQUEST_ID_HEADER]: requestId,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      this.logger.error(`The admin service can't be reached: ${String(error)}`);
      throw this.unavailable();
    }
  }

  /** The admin service's answer as this API's error. Its validation errors are passed on unchanged. */
  private async toException(response: Response): Promise<HttpException> {
    switch (response.status) {
      case HttpStatus.UNPROCESSABLE_ENTITY: {
        const { errors } = (await response.json()) as {
          errors: Record<string, string[]>;
        };
        return new UnprocessableEntityException({
          message: 'Validation failed',
          errors,
        });
      }
      case HttpStatus.NOT_FOUND:
        return new NotFoundException('Product not found');
      default:
        this.logger.error(`The admin service answered ${response.status}`);
        return this.unavailable();
    }
  }

  private unavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException(
      'The catalog service is unavailable, please try again later',
    );
  }
}
