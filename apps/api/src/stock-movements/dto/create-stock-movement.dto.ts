import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '@prisma/client';

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateStockMovementDto {
  @ApiProperty({
    description: 'ID da loja',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @Matches(UUID_LIKE_REGEX, {
    message: 'storeId deve ter formato UUID válido'
  })
  storeId!: string;

  @ApiProperty({
    description: 'ID do produto',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @Matches(UUID_LIKE_REGEX, {
    message: 'productId deve ter formato UUID válido'
  })
  productId!: string;

  @ApiProperty({
    description: 'Tipo da movimentação',
    enum: StockMovementType,
    example: StockMovementType.IN
  })
  @IsEnum(StockMovementType, {
    message: 'type deve ser IN, OUT ou ADJUSTMENT'
  })
  type!: StockMovementType;

  @ApiProperty({
    description: 'Quantidade movimentada',
    example: 5
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

  @ApiPropertyOptional({
    description: 'Motivo da movimentação',
    example: 'Entrada manual de estoque',
    maxLength: 255
  })
  @IsOptional()
  @IsString({
    message: 'reason deve ser um texto'
  })
  @IsNotEmpty({
    message: 'reason não pode ser vazio'
  })
  @MaxLength(255, {
    message: 'reason deve ter no máximo 255 caracteres'
  })
  reason?: string;

  @ApiPropertyOptional({
    description: 'Documento ou referência externa da movimentação',
    example: 'NF-12345',
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
}
