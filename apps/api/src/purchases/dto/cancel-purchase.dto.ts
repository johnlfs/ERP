import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelPurchaseDto {
  @ApiProperty({
    description: 'Motivo do cancelamento da compra',
    example: 'Cancelamento pelo smoke test',
    maxLength: 500
  })
  @IsString({
    message: 'reason deve ser um texto'
  })
  @IsNotEmpty({
    message: 'reason não pode ser vazio'
  })
  @MaxLength(500, {
    message: 'reason deve ter no máximo 500 caracteres'
  })
  reason!: string;
}
