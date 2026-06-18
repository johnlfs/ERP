import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelSaleDto {
  @ApiProperty({
    description: 'Motivo do cancelamento da venda',
    example: 'Cliente desistiu da compra',
    maxLength: 500
  })
  @IsString({
    message: 'reason deve ser um texto'
  })
  @IsNotEmpty({
    message: 'reason é obrigatório'
  })
  @MaxLength(500, {
    message: 'reason deve ter no máximo 500 caracteres'
  })
  reason!: string;
}
