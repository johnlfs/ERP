import { IsDateString, IsEnum, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AccountPayableStatus } from '@prisma/client';
import { ListQueryDto } from '../../common/dto/list-query.dto';

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ListAccountsPayableQueryDto extends ListQueryDto {
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
    description: 'Filtra por fornecedor',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @Matches(UUID_LIKE_REGEX, {
    message: 'supplierId deve ter formato UUID válido'
  })
  supplierId?: string;

  @ApiPropertyOptional({
    description: 'Filtra por compra',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @Matches(UUID_LIKE_REGEX, {
    message: 'purchaseId deve ter formato UUID válido'
  })
  purchaseId?: string;

  @ApiPropertyOptional({
    description: 'Filtra por status da conta a pagar',
    enum: AccountPayableStatus,
    example: AccountPayableStatus.OPEN
  })
  @IsOptional()
  @IsEnum(AccountPayableStatus, {
    message: 'status deve ser OPEN, PAID ou CANCELED'
  })
  status?: AccountPayableStatus;

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
}
