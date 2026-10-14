import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RequestId } from '../common/decorators/request-id.decorator.js';
import { UserRole } from '../users/user-role.enum.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListProductsQueryDto } from './dto/list-products-query.dto.js';
import { ProductListResponseDto } from './dto/product-list-response.dto.js';
import { ProductResponseDto } from './dto/product-response.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductsService } from './products.service.js';

/** The product catalog: anyone can browse it, only admins change it. */
@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /** List products, newest first, with filters */
  @Public()
  @Get()
  list(@Query() query: ListProductsQueryDto): Promise<ProductListResponseDto> {
    return this.productsService.list(query);
  }

  /** Get one product */
  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponseDto> {
    return this.productsService.findById(id);
  }

  /** Create a product (admins). Saved by the admin service, which owns the catalog. */
  @ApiBearerAuth()
  @Roles(UserRole.Admin)
  @Post()
  create(
    @Body() data: CreateProductDto,
    @RequestId() requestId: string,
  ): Promise<ProductResponseDto> {
    return this.productsService.create(data, requestId);
  }

  /** Replace a product's details (admins). Saved by the admin service, which owns the catalog. */
  @ApiBearerAuth()
  @Roles(UserRole.Admin)
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateProductDto,
    @RequestId() requestId: string,
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, data, requestId);
  }
}
