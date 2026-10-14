import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { InternalApi } from '../auth/decorators/internal-api.decorator.js';
import { CatalogSyncService } from './catalog-sync.service.js';
import { SyncCategoryDto } from './dto/sync-category.dto.js';
import { SyncProductDto } from './dto/sync-product.dto.js';

/**
 * Receives the catalog from the admin service (its sync jobs call these routes).
 *
 * Internal API: /internal/v1/… is outside /api, so nginx never exposes it — only containers on the
 * Docker network reach it, and they need the API key. Every call can be repeated safely: 204 either way.
 */
@InternalApi()
@Controller({ path: 'internal/v1/sync', version: VERSION_NEUTRAL })
export class CatalogSyncController {
  constructor(private readonly catalogSync: CatalogSyncService) {}

  @Put('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async saveCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: SyncCategoryDto,
  ): Promise<void> {
    await this.catalogSync.saveCategory(id, data);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCategory(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.catalogSync.removeCategory(id);
  }

  @Put('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async saveProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: SyncProductDto,
  ): Promise<void> {
    await this.catalogSync.saveProduct(id, data);
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hideProduct(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.catalogSync.hideProduct(id);
  }
}
