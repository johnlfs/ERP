import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCustomerStatusDto {
  @ApiProperty({
    description: 'Define se o cliente está ativo',
    example: true
  })
  @IsBoolean({
    message: 'isActive deve ser booleano'
  })
  isActive!: boolean;
}
