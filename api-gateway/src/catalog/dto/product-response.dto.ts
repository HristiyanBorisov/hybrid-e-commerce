import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Product } from '../product.entity.js';
import { ProductCategoryDto } from './product-category.dto.js';

/** A product as the API returns it. */
@ObjectType('Product')
export class ProductResponseDto {
  @Field(() => ID)
  id: string;

  @Field()
  sku: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field(() => String, { nullable: true })
  description: string | null;

  /** Price in cents: 1999 = 19.99 */
  @Field(() => Int)
  priceCents: number;

  @Field(() => String, { nullable: true })
  imageUrl: string | null;

  @Field(() => String, { nullable: true })
  thumbnailUrl: string | null;

  /** Units in stock right now */
  @Field(() => Int)
  stock: number;

  /** null for a moment if the product arrived before its category */
  @Field(() => ProductCategoryDto, { nullable: true })
  category: ProductCategoryDto | null;

  static fromEntity(product: Product): ProductResponseDto {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      description: product.description,
      priceCents: product.priceCents,
      imageUrl: product.imageUrl,
      thumbnailUrl: product.thumbnailUrl,
      stock: product.stockLevel?.quantity ?? 0,
      category: product.category
        ? ProductCategoryDto.fromEntity(product.category)
        : null,
    };
  }
}
