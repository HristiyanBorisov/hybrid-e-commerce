import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Category } from '../category.entity.js';

/** The category shown with each product. */
@ObjectType('ProductCategory')
export class ProductCategoryDto {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  static fromEntity(category: Category): ProductCategoryDto {
    return { id: category.id, name: category.name, slug: category.slug };
  }
}
