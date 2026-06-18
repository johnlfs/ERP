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

export class CreateSupplierDto {
  @ApiProperty({
    description: 'ID da loja',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @Matches(UUID_LIKE_REGEX, {
    message: 'storeId deve ter formato UUID válido'
  })
  storeId!: string;

  @ApiProperty({
    description: 'Nome do fornecedor',
    example: 'Fornecedor Smoke',
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
    description: 'Documento do fornecedor',
    example: 'SMOKE-SUP-DOC-123',
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
    description: 'E-mail do fornecedor',
    example: 'fornecedor.smoke@example.com',
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
    description: 'Telefone do fornecedor',
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
    description: 'Nome do contato no fornecedor',
    example: 'Contato Smoke',
    maxLength: 160
  })
  @IsOptional()
  @IsString({
    message: 'contactName deve ser um texto'
  })
  @IsNotEmpty({
    message: 'contactName não pode ser vazio'
  })
  @MaxLength(160, {
    message: 'contactName deve ter no máximo 160 caracteres'
  })
  contactName?: string;

  @ApiPropertyOptional({
    description: 'Observações do fornecedor',
    example: 'Fornecedor criado pelo smoke test',
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
