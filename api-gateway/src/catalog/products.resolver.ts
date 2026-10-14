import { ParseUUIDPipe } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { Public } from '../auth/decorators/public.decorator.js';
import { ListProductsQueryDto } from './dto/list-products-query.dto.js';
import { ProductListResponseDto } from './dto/product-list-response.dto.js';
import { ProductResponseDto } from './dto/product-response.dto.js';
import { ProductsService } from './products.service.js';

/** The product catalog in GraphQL — the same data, filters and cache as GET /api/v1/products. */
@Resolver(() => ProductResponseDto)
export class ProductsResolver {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Query(() => ProductListResponseDto, {
    description:
      'Products, newest first, with the same filters as the REST list',
  })
  products(
    @Args() query: ListProductsQueryDto,
  ): Promise<ProductListResponseDto> {
    return this.productsService.list(query);
  }

  @Public()
  @Query(() => ProductResponseDto, { description: 'One product' })
  product(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<ProductResponseDto> {
    return this.productsService.findById(id);
  }
}
