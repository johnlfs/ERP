import { IsEnum, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseStatus } from '@prisma/client';
import { ListQueryDto } from '../../common/dto/list-query.dto';

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ListPurchasesQueryDto extends ListQueryDto {
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
    description: 'Filtra por status da compra',
    enum: PurchaseStatus,
    example: PurchaseStatus.RECEIVED
  })
  @IsOptional()
  @IsEnum(PurchaseStatus, {
    message: 'status deve ser RECEIVED ou CANCELED'
  })
  status?: PurchaseStatus;
}
