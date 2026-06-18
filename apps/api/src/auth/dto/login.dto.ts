import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'E-mail do usuário',
    example: 'admin@retailflow.local'
  })
  @IsEmail(
    {},
    {
      message: 'email deve ser um e-mail válido'
    }
  )
  email!: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'Admin@123456',
    maxLength: 120
  })
  @IsString({
    message: 'password deve ser um texto'
  })
  @IsNotEmpty({
    message: 'password é obrigatório'
  })
  @MaxLength(120, {
    message: 'password deve ter no máximo 120 caracteres'
  })
  password!: string;
}
