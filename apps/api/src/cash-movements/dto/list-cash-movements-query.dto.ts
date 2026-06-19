import { IsDateString, IsEnum, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CashMovementSource, CashMovementType } from '@prisma/client';
import { ListQueryDto } from '../../common/dto/list-query.dto';

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ListCashMovementsQueryDto extends ListQueryDto {
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
    description: 'Filtra por conta a pagar',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @Matches(UUID_LIKE_REGEX, {
    message: 'accountPayableId deve ter formato UUID válido'
  })
  accountPayableId?: string;

  @ApiPropertyOptional({
    description: 'Filtra por conta a receber',
    example: '00000000-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @Matches(UUID_LIKE_REGEX, {
    message: 'accountReceivableId deve ter formato UUID válido'
  })
  accountReceivableId?: string;

  @ApiPropertyOptional({
    description: 'Filtra por tipo do movimento de caixa',
    enum: CashMovementType,
    example: CashMovementType.INFLOW
  })
  @IsOptional()
  @IsEnum(CashMovementType, {
    message: 'type deve ser INFLOW ou OUTFLOW'
  })
  type?: CashMovementType;

  @ApiPropertyOptional({
    description: 'Filtra por origem do movimento de caixa',
    enum: CashMovementSource,
    example: CashMovementSource.ACCOUNT_RECEIVABLE
  })
  @IsOptional()
  @IsEnum(CashMovementSource, {
    message: 'source deve ser ACCOUNT_PAYABLE, ACCOUNT_RECEIVABLE ou MANUAL'
  })
  source?: CashMovementSource;

  @ApiPropertyOptional({
    description: 'Filtra movimentos a partir desta data de ocorrência',
    example: '2030-01-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'occurredAtFrom deve ser uma data ISO válida'
    }
  )
  occurredAtFrom?: string;

  @ApiPropertyOptional({
    description: 'Filtra movimentos até esta data de ocorrência',
    example: '2030-12-31T23:59:59.999Z'
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'occurredAtTo deve ser uma data ISO válida'
    }
  )
  occurredAtTo?: string;
}
