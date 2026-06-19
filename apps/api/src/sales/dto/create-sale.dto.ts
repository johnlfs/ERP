import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsArray,
  IsEnum,
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
import { PaymentMethod } from '@prisma/client';

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateSaleItemDto {
  @ApiProperty({
    description: 'ID do produto',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @Matches(UUID_LIKE_REGEX, {
    message: 'productId deve ter formato UUID válido'
  })
  productId!: string;

  @ApiProperty({
    description: 'Quantidade vendida',
    example: 2
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
    description: 'Preço unitário',
    example: 24.9
  })
  @IsNumber(
    {
      maxDecimalPlaces: 2
    },
    {
      message: 'unitPrice deve ser um número'
    }
  )
  @Min(0, {
    message: 'unitPrice não pode ser negativo'
  })
  unitPrice!: number;

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

export class CreateSaleDto {
  @ApiProperty({
    description: 'ID da loja',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @Matches(UUID_LIKE_REGEX, {
    message: 'storeId deve ter formato UUID válido'
  })
  storeId!: string;

  @ApiPropertyOptional({
    description: 'ID do cliente',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @Matches(UUID_LIKE_REGEX, {
    message: 'customerId deve ter formato UUID válido'
  })
  customerId?: string;

  @ApiProperty({
    description: 'Forma de pagamento',
    enum: PaymentMethod,
    example: PaymentMethod.PIX
  })
  @IsEnum(PaymentMethod, {
    message: 'paymentMethod deve ser CASH, PIX, CREDIT_CARD, DEBIT_CARD ou OTHER'
  })
  paymentMethod!: PaymentMethod;

  @ApiProperty({
    description: 'Itens da venda',
    type: [CreateSaleItemDto]
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
  @Type(() => CreateSaleItemDto)
  items!: CreateSaleItemDto[];

  @ApiPropertyOptional({
    description: 'Desconto geral da venda',
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
    description: 'Data de vencimento da conta a receber gerada pela venda',
    example: '2030-03-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'dueDate deve ser uma data ISO válida'
    }
  )
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Documento ou referência externa',
    example: 'SMOKE-SALE-123',
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
    description: 'Observações da venda',
    example: 'Venda balcão',
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
