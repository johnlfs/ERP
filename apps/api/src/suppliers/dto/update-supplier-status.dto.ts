import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSupplierStatusDto {
  @ApiProperty({
    description: 'Define se o fornecedor está ativo',
    example: true
  })
  @IsBoolean({
    message: 'isActive deve ser booleano'
  })
  isActive!: boolean;
}
