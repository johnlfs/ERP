import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: 'Novo nome da categoria',
    example: 'Bebidas não alcoólicas',
    maxLength: 120
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString({
    message: 'name deve ser um texto'
  })
  @IsNotEmpty({
    message: 'name não pode ser vazio'
  })
  @MaxLength(120, {
    message: 'name deve ter no máximo 120 caracteres'
  })
  name?: string;
}
