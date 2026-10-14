import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Body of PUT /internal/v1/sync/categories/:id — the whole category as the admin service has it now
 * (its CategoryResource). The id is taken from the URL.
 */
export class SyncCategoryDto {
  /** null = top level */
  @IsOptional()
  @IsUUID()
  parentId: string | null = null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  slug: string;

  /** Goes up with every change in the admin service */
  @IsInt()
  @Min(1)
  version: number;
}
