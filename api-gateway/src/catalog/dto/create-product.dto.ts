import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Body of POST /products. Forwarded to the admin service, which owns the catalog and checks the rest
 * (unique SKU, existing category). Images are uploaded in the admin panel.
 */
export class CreateProductDto {
  @IsUUID()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  sku: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  /** Price in cents: 1999 = 19.99 */
  @IsInt()
  @Min(0)
  @Max(999_999_900)
  priceCents: number;
}
