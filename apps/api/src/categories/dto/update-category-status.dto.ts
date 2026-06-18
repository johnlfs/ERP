import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryStatusDto {
  @ApiProperty({
    description: 'Define se a categoria está ativa',
    example: false
  })
  @IsBoolean({
    message: 'isActive deve ser booleano'
  })
  isActive!: boolean;
}
