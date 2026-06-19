import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const ACCOUNT_RECEIVABLE_RECEIPT_METHODS = [
  'PIX',
  'DINHEIRO',
  'CARTAO_DEBITO',
  'CARTAO_CREDITO',
  'BOLETO',
  'TRANSFERENCIA',
  'OUTRO'
] as const;

export class ReceiveAccountReceivableDto {
  @ApiProperty({
    description: 'Forma de recebimento usada na baixa',
    example: 'PIX',
    enum: ACCOUNT_RECEIVABLE_RECEIPT_METHODS,
    maxLength: 40
  })
  @IsString({
    message: 'receiptMethod deve ser um texto'
  })
  @IsNotEmpty({
    message: 'receiptMethod não pode ser vazio'
  })
  @IsIn(ACCOUNT_RECEIVABLE_RECEIPT_METHODS, {
    message:
      'receiptMethod deve ser PIX, DINHEIRO, CARTAO_DEBITO, CARTAO_CREDITO, BOLETO, TRANSFERENCIA ou OUTRO'
  })
  @MaxLength(40, {
    message: 'receiptMethod deve ter no máximo 40 caracteres'
  })
  receiptMethod!: string;

  @ApiPropertyOptional({
    description:
      'Valor recebido. Nesta fase, apenas recebimento total é aceito; se omitido, usa o valor total da conta.',
    example: 45
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {
      maxDecimalPlaces: 2
    },
    {
      message: 'receivedAmount deve ser um número'
    }
  )
  @Min(0.01, {
    message: 'receivedAmount deve ser maior que zero'
  })
  receivedAmount?: number;

  @ApiPropertyOptional({
    description: 'Data/hora do recebimento. Se omitida, usa a data atual.',
    example: '2030-05-02T12:00:00.000Z'
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'receivedAt deve ser uma data ISO válida'
    }
  )
  receivedAt?: string;

  @ApiPropertyOptional({
    description: 'Observações do recebimento',
    example: 'Recebimento realizado pelo smoke test',
    maxLength: 500
  })
  @IsOptional()
  @IsString({
    message: 'receiptNotes deve ser um texto'
  })
  @IsNotEmpty({
    message: 'receiptNotes não pode ser vazio'
  })
  @MaxLength(500, {
    message: 'receiptNotes deve ter no máximo 500 caracteres'
  })
  receiptNotes?: string;
}
