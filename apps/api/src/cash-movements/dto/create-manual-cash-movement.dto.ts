import {
  IsDateString,
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
import { CashMovementType } from '@prisma/client';

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateManualCashMovementDto {
  @ApiProperty({
    description: 'Loja do movimento manual de caixa',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @Matches(UUID_LIKE_REGEX, {
    message: 'storeId deve ter formato UUID válido'
  })
  storeId!: string;

  @ApiProperty({
    description: 'Tipo do movimento manual',
    enum: CashMovementType,
    example: CashMovementType.INFLOW
  })
  @IsEnum(CashMovementType, {
    message: 'type deve ser INFLOW ou OUTFLOW'
  })
  type!: CashMovementType;

  @ApiProperty({
    description: 'Valor do movimento manual',
    example: 100
  })
  @IsNumber(
    {
      maxDecimalPlaces: 2
    },
    {
      message: 'amount deve ser um número válido com até 2 casas decimais'
    }
  )
  @Min(0.01, {
    message: 'amount deve ser maior que zero'
  })
  amount!: number;

  @ApiProperty({
    description: 'Descrição obrigatória do movimento manual',
    example: 'Suprimento de caixa'
  })
  @IsString({
    message: 'description deve ser texto'
  })
  @IsNotEmpty({
    message: 'description é obrigatório'
  })
  @MaxLength(255, {
    message: 'description deve ter no máximo 255 caracteres'
  })
  description!: string;

  @ApiPropertyOptional({
    description: 'Data de ocorrência do movimento manual',
    example: '2030-06-10T10:00:00.000Z'
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'occurredAt deve ser uma data ISO válida'
    }
  )
  occurredAt?: string;

  @ApiPropertyOptional({
    description: 'Documento ou referência do movimento manual',
    example: 'SMOKE-CASH-MANUAL-IN'
  })
  @IsOptional()
  @IsString({
    message: 'document deve ser texto'
  })
  @MaxLength(100, {
    message: 'document deve ter no máximo 100 caracteres'
  })
  document?: string;

  @ApiPropertyOptional({
    description: 'Observações adicionais do movimento manual',
    example: 'Lançamento manual criado pelo smoke test'
  })
  @IsOptional()
  @IsString({
    message: 'notes deve ser texto'
  })
  @MaxLength(500, {
    message: 'notes deve ter no máximo 500 caracteres'
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Não permitido para movimento manual',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @Matches(UUID_LIKE_REGEX, {
    message: 'accountPayableId deve ter formato UUID válido'
  })
  accountPayableId?: string;

  @ApiPropertyOptional({
    description: 'Não permitido para movimento manual',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @Matches(UUID_LIKE_REGEX, {
    message: 'accountReceivableId deve ter formato UUID válido'
  })
  accountReceivableId?: string;
}
