import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreatePurchaseItemDto {
  @ApiProperty({
    description: 'ID do produto',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @Matches(UUID_LIKE_REGEX, {
    message: 'productId deve ter formato UUID válido'
  })
  productId!: string;

  @ApiProperty({
    description: 'Quantidade comprada',
    example: 4
  })
  @IsNumber(
    {
      maxDecimalPlaces: 3
    },
    {
      message: 'quantity deve ser um número'
    }
  )
  @Min(0.001, {
    message: 'quantity deve ser maior que zero'
  })
  quantity!: number;

  @ApiProperty({
    description: 'Custo unitário',
    example: 11.25
  })
  @IsNumber(
    {
      maxDecimalPlaces: 2
    },
    {
      message: 'unitCost deve ser um número'
    }
  )
  @Min(0, {
    message: 'unitCost não pode ser negativo'
  })
  unitCost!: number;

  @ApiPropertyOptional({
    description: 'Desconto do item',
    example: 0
  })
  @IsOptional()
  @IsNumber(
    {
      maxDecimalPlaces: 2
    },
    {
      message: 'discount deve ser um número'
    }
  )
  @Min(0, {
    message: 'discount não pode ser negativo'
  })
  discount?: number;
}

export class CreatePurchaseDto {
  @ApiProperty({
    description: 'ID da loja',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @Matches(UUID_LIKE_REGEX, {
    message: 'storeId deve ter formato UUID válido'
  })
  storeId!: string;

  @ApiPropertyOptional({
    description: 'ID do fornecedor',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @Matches(UUID_LIKE_REGEX, {
    message: 'supplierId deve ter formato UUID válido'
  })
  supplierId?: string;

  @ApiProperty({
    description: 'Itens da compra',
    type: [CreatePurchaseItemDto]
  })
  @IsArray({
    message: 'items deve ser uma lista'
  })
  @ArrayMinSize(1, {
    message: 'items deve conter pelo menos um item'
  })
  @ValidateNested({
    each: true
  })
  @Type(() => CreatePurchaseItemDto)
  items!: CreatePurchaseItemDto[];

  @ApiPropertyOptional({
    description: 'Desconto geral da compra',
    example: 0
  })
  @IsOptional()
  @IsNumber(
    {
      maxDecimalPlaces: 2
    },
    {
      message: 'discount deve ser um número'
    }
  )
  @Min(0, {
    message: 'discount não pode ser negativo'
  })
  discount?: number;

  @ApiPropertyOptional({
    description: 'Documento ou referência externa',
    example: 'SMOKE-PURCHASE-123',
    maxLength: 80
  })
  @IsOptional()
  @IsString({
    message: 'document deve ser um texto'
  })
  @IsNotEmpty({
    message: 'document não pode ser vazio'
  })
  @MaxLength(80, {
    message: 'document deve ter no máximo 80 caracteres'
  })
  document?: string;

  @ApiPropertyOptional({
    description: 'Observações da compra',
    example: 'Compra recebida no estoque',
    maxLength: 500
  })
  @IsOptional()
  @IsString({
    message: 'notes deve ser um texto'
  })
  @IsNotEmpty({
    message: 'notes não pode ser vazio'
  })
  @MaxLength(500, {
    message: 'notes deve ter no máximo 500 caracteres'
  })
  notes?: string;
}
