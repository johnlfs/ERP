import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateCustomerDto {
  @ApiProperty({
    description: 'ID da loja',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @Matches(UUID_LIKE_REGEX, {
    message: 'storeId deve ter formato UUID válido'
  })
  storeId!: string;

  @ApiProperty({
    description: 'Nome do cliente',
    example: 'Cliente Smoke',
    maxLength: 160
  })
  @IsString({
    message: 'name deve ser um texto'
  })
  @IsNotEmpty({
    message: 'name é obrigatório'
  })
  @MaxLength(160, {
    message: 'name deve ter no máximo 160 caracteres'
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Documento do cliente',
    example: 'SMOKE-DOC-123',
    maxLength: 32
  })
  @IsOptional()
  @IsString({
    message: 'document deve ser um texto'
  })
  @IsNotEmpty({
    message: 'document não pode ser vazio'
  })
  @MaxLength(32, {
    message: 'document deve ter no máximo 32 caracteres'
  })
  document?: string;

  @ApiPropertyOptional({
    description: 'E-mail do cliente',
    example: 'cliente.smoke@example.com',
    maxLength: 160
  })
  @IsOptional()
  @IsEmail(
    {},
    {
      message: 'email deve ser um e-mail válido'
    }
  )
  @MaxLength(160, {
    message: 'email deve ter no máximo 160 caracteres'
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Telefone do cliente',
    example: '+5544999999999',
    maxLength: 32
  })
  @IsOptional()
  @IsString({
    message: 'phone deve ser um texto'
  })
  @IsNotEmpty({
    message: 'phone não pode ser vazio'
  })
  @MaxLength(32, {
    message: 'phone deve ter no máximo 32 caracteres'
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Observações do cliente',
    example: 'Cliente criado pelo smoke test',
    maxLength: 500
  })
  @IsOptional()
  @IsString({
    message: 'notes deve ser um texto'
  })
  @IsNotEmpty({
    message: 'notes não pode ser vazio'
  })
  @MaxLength(500, {
    message: 'notes deve ter no máximo 500 caracteres'
  })
  notes?: string;
}
