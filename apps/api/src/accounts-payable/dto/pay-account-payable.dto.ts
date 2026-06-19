import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PayAccountPayableDto {
  @ApiProperty({
    description: 'Forma de pagamento usada na baixa',
    example: 'PIX',
    maxLength: 40
  })
  @IsString({
    message: 'paymentMethod deve ser um texto'
  })
  @IsNotEmpty({
    message: 'paymentMethod não pode ser vazio'
  })
  @MaxLength(40, {
    message: 'paymentMethod deve ter no máximo 40 caracteres'
  })
  paymentMethod!: string;

  @ApiPropertyOptional({
    description:
      'Valor pago. Nesta fase, apenas baixa total é aceita; se omitido, usa o valor total da conta.',
    example: 45
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {
      maxDecimalPlaces: 2
    },
    {
      message: 'paidAmount deve ser um número'
    }
  )
  @Min(0.01, {
    message: 'paidAmount deve ser maior que zero'
  })
  paidAmount?: number;

  @ApiPropertyOptional({
    description: 'Data/hora da baixa. Se omitida, usa a data atual.',
    example: '2030-02-01T12:00:00.000Z'
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'paidAt deve ser uma data ISO válida'
    }
  )
  paidAt?: string;

  @ApiPropertyOptional({
    description: 'Observações da baixa',
    example: 'Baixa realizada pelo smoke test',
    maxLength: 500
  })
  @IsOptional()
  @IsString({
    message: 'paymentNotes deve ser um texto'
  })
  @IsNotEmpty({
    message: 'paymentNotes não pode ser vazio'
  })
  @MaxLength(500, {
    message: 'paymentNotes deve ter no máximo 500 caracteres'
  })
  paymentNotes?: string;
}
