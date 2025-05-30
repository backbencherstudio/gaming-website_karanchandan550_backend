import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductType {
  FRUIT = 'fruit',
  VEGETABLE = 'vegetable',
  // Add more types as needed
}

export enum ProductCategory {
  FRESH = 'fresh',
  SEASONAL = 'seasonal',
  IMPORTED = 'imported',
  // Add more categories as needed
}

export class CreateDashboardDto {
  @IsString()
  name: string;

  @IsEnum(ProductType, { message: 'Invalid product type' })
  type: ProductType;

  @IsEnum(ProductCategory, { message: 'Invalid product category' })
  category: ProductCategory;

  @Type(() => Number)
  @IsNumber({}, { message: 'Regular price must be a number' })
  regularPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Discount price must be a number' })
  discountPrice?: number;

  // ❌ Remove imageUrl from client-sent data — it's generated on server
  @IsOptional()
  @IsString()
  imageUrl?: string; // ✅ Keep optional to allow merging before saving to DB
}
