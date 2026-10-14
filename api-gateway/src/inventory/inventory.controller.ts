import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import { UserRole } from '../users/user-role.enum.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { StockLevelResponseDto } from './dto/stock-level-response.dto.js';
import { InventoryService } from './inventory.service.js';

/** Stock management for admins. Stock is shown in every product response. */
@ApiTags('inventory')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  /** Add or remove stock by hand, e.g. a delivery arrived or items were damaged */
  @Post(':productId/adjustments')
  @ApiConflictResponse({
    description: 'The stock would go below 0',
    type: ErrorResponseDto,
  })
  async adjust(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() data: AdjustStockDto,
  ): Promise<StockLevelResponseDto> {
    return StockLevelResponseDto.fromEntity(
      await this.inventory.adjust(productId, data.quantityChange),
    );
  }
}
