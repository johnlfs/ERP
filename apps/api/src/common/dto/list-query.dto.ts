import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListQueryDto {
  @ApiPropertyOptional({
    description: 'Página atual da listagem',
    example: 1,
    default: 1,
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: 'page deve ser um número inteiro'
  })
  @Min(1, {
    message: 'page deve ser maior ou igual a 1'
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por página',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: 'pageSize deve ser um número inteiro'
  })
  @Min(1, {
    message: 'pageSize deve ser maior ou igual a 1'
  })
  @Max(100, {
    message: 'pageSize deve ser no máximo 100'
  })
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'Texto de busca',
    example: 'produto',
    maxLength: 120
  })
  @IsOptional()
  @IsString({
    message: 'search deve ser um texto'
  })
  @MaxLength(120, {
    message: 'search deve ter no máximo 120 caracteres'
  })
  search?: string;
}
