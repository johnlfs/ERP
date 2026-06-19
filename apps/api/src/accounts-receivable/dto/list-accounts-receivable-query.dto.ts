import { IsDateString, IsEnum, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AccountReceivableStatus } from '@prisma/client';
import { ListQueryDto } from '../../common/dto/list-query.dto';

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ListAccountsReceivableQueryDto extends ListQueryDto {
  @ApiPropertyOptional({
    description: 'Filtra por loja',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @Matches(UUID_LIKE_REGEX, {
    message: 'storeId deve ter formato UUID válido'
  })
  storeId?: string;

  @ApiPropertyOptional({
    description: 'Filtra por cliente',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @Matches(UUID_LIKE_REGEX, {
    message: 'customerId deve ter formato UUID válido'
  })
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filtra por venda',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @Matches(UUID_LIKE_REGEX, {
    message: 'saleId deve ter formato UUID válido'
  })
  saleId?: string;

  @ApiPropertyOptional({
    description: 'Filtra por status da conta a receber',
    enum: AccountReceivableStatus,
    example: AccountReceivableStatus.OPEN
  })
  @IsOptional()
  @IsEnum(AccountReceivableStatus, {
    message: 'status deve ser OPEN, RECEIVED ou CANCELED'
  })
  status?: AccountReceivableStatus;

  @ApiPropertyOptional({
    description: 'Filtra contas com vencimento a partir desta data',
    example: '2030-01-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'dueDateFrom deve ser uma data ISO válida'
    }
  )
  dueDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filtra contas com vencimento até esta data',
    example: '2030-12-31T23:59:59.999Z'
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'dueDateTo deve ser uma data ISO válida'
    }
  )
  dueDateTo?: string;

  @ApiPropertyOptional({
    description: 'Filtra contas recebidas a partir desta data de recebimento',
    example: '2030-03-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'receivedAtFrom deve ser uma data ISO válida'
    }
  )
  receivedAtFrom?: string;

  @ApiPropertyOptional({
    description: 'Filtra contas recebidas até esta data de recebimento',
    example: '2030-03-31T23:59:59.999Z'
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'receivedAtTo deve ser uma data ISO válida'
    }
  )
  receivedAtTo?: string;
}
