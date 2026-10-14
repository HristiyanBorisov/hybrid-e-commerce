import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Body of PUT /internal/v1/sync/products/:id — the whole product as the admin service has it now
 * (its ProductResource). The id is taken from the URL; fields the copy doesn't keep (updatedAt) are dropped.
 */
export class SyncProductDto {
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

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  slug: string;

  @IsOptional()
  @IsString()
  description: string | null = null;

  /** 1999 = 19.99 */
  @IsInt()
  @Min(0)
  priceCents: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageUrl: string | null = null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  thumbnailUrl: string | null = null;

  /** Goes up with every change in the admin service */
  @IsInt()
  @Min(1)
  version: number;

  /** ISO 8601, e.g. 2026-10-12T09:30:00+00:00 */
  @IsISO8601()
  createdAt: string;

  /** Set when the product was soft-deleted: the copy hides it */
  @IsOptional()
  @IsISO8601()
  deletedAt: string | null = null;
}
