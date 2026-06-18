import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateCategoryDto {
  @ApiProperty({
    description: 'ID da loja dona da categoria',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @IsString({
    message: 'storeId deve ser um texto'
  })
  @Matches(UUID_LIKE_REGEX, {
    message: 'storeId deve ser um UUID válido'
  })
  storeId!: string;

  @ApiProperty({
    description: 'Nome da categoria',
    example: 'Bebidas',
    maxLength: 120
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({
    message: 'name deve ser um texto'
  })
  @IsNotEmpty({
    message: 'name é obrigatório'
  })
  @MaxLength(120, {
    message: 'name deve ter no máximo 120 caracteres'
  })
  name!: string;
}
