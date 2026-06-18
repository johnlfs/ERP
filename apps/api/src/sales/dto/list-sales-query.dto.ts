import { IsEnum, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, SaleStatus } from '@prisma/client';
import { ListQueryDto } from '../../common/dto/list-query.dto';

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ListSalesQueryDto extends ListQueryDto {
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
    description: 'Filtra por status',
    enum: SaleStatus,
    example: SaleStatus.COMPLETED
  })
  @IsOptional()
  @IsEnum(SaleStatus, {
    message: 'status deve ser COMPLETED ou CANCELED'
  })
  status?: SaleStatus;

  @ApiPropertyOptional({
    description: 'Filtra por forma de pagamento',
    enum: PaymentMethod,
    example: PaymentMethod.PIX
  })
  @IsOptional()
  @IsEnum(PaymentMethod, {
    message: 'paymentMethod deve ser CASH, PIX, CREDIT_CARD, DEBIT_CARD ou OTHER'
  })
  paymentMethod?: PaymentMethod;
}
