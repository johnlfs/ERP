import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateProductDto {
  @ApiProperty({
    description: 'ID da loja dona do produto',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @IsString({
    message: 'storeId deve ser um texto'
  })
  @Matches(UUID_LIKE_REGEX, {
    message: 'storeId deve ser um UUID válido'
  })
  storeId!: string;

  @ApiProperty({
    description: 'ID da categoria do produto',
    example: 'a3c33799-f75b-4c13-a17e-579c7bd35d0d'
  })
  @IsString({
    message: 'categoryId deve ser um texto'
  })
  @Matches(UUID_LIKE_REGEX, {
    message: 'categoryId deve ser um UUID válido'
  })
  categoryId!: string;

  @ApiProperty({
    description: 'Código interno do produto na loja',
    example: 'PROD-001',
    maxLength: 60
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({
    message: 'internalCode deve ser um texto'
  })
  @IsNotEmpty({
    message: 'internalCode é obrigatório'
  })
  @MaxLength(60, {
    message: 'internalCode deve ter no máximo 60 caracteres'
  })
  internalCode!: string;

  @ApiPropertyOptional({
    description: 'Código de barras do produto',
    example: '7890000000011',
    maxLength: 80
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString({
    message: 'barcode deve ser um texto'
  })
  @IsNotEmpty({
    message: 'barcode não pode ser vazio'
  })
  @MaxLength(80, {
    message: 'barcode deve ter no máximo 80 caracteres'
  })
  barcode?: string;

  @ApiProperty({
    description: 'Nome do produto',
    example: 'Refrigerante 2L',
    maxLength: 180
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({
    message: 'name deve ser um texto'
  })
  @IsNotEmpty({
    message: 'name é obrigatório'
  })
  @MaxLength(180, {
    message: 'name deve ter no máximo 180 caracteres'
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição do produto',
    example: 'Produto cadastrado para venda no PDV',
    maxLength: 500
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString({
    message: 'description deve ser um texto'
  })
  @MaxLength(500, {
    message: 'description deve ter no máximo 500 caracteres'
  })
  description?: string;

  @ApiProperty({
    description: 'Preço de custo',
    example: 10.5,
    minimum: 0
  })
  @Type(() => Number)
  @IsNumber(
    {
      maxDecimalPlaces: 4
    },
    {
      message: 'costPrice deve ser um número válido'
    }
  )
  @Min(0, {
    message: 'costPrice deve ser maior ou igual a 0'
  })
  costPrice!: number;

  @ApiProperty({
    description: 'Preço de venda',
    example: 19.9,
    minimum: 0
  })
  @Type(() => Number)
  @IsNumber(
    {
      maxDecimalPlaces: 4
    },
    {
      message: 'salePrice deve ser um número válido'
    }
  )
  @Min(0, {
    message: 'salePrice deve ser maior ou igual a 0'
  })
  salePrice!: number;

  @ApiPropertyOptional({
    description: 'NCM do produto com 8 dígitos',
    example: '00000000'
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @Matches(/^\d{8}$/, {
    message: 'ncm deve conter exatamente 8 dígitos'
  })
  ncm?: string;

  @ApiPropertyOptional({
    description: 'Unidade de medida',
    example: 'UN',
    maxLength: 10
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value
  )
  @IsOptional()
  @IsString({
    message: 'unit deve ser um texto'
  })
  @IsNotEmpty({
    message: 'unit não pode ser vazio'
  })
  @MaxLength(10, {
    message: 'unit deve ter no máximo 10 caracteres'
  })
  unit?: string;

  @ApiPropertyOptional({
    description: 'Estoque mínimo',
    example: 5,
    minimum: 0
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {
      maxDecimalPlaces: 4
    },
    {
      message: 'minStock deve ser um número válido'
    }
  )
  @Min(0, {
    message: 'minStock deve ser maior ou igual a 0'
  })
  minStock?: number;

  @ApiPropertyOptional({
    description: 'Estoque atual',
    example: 100,
    minimum: 0
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {
      maxDecimalPlaces: 4
    },
    {
      message: 'currentStock deve ser um número válido'
    }
  )
  @Min(0, {
    message: 'currentStock deve ser maior ou igual a 0'
  })
  currentStock?: number;
}
