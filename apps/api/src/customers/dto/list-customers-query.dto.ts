import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ListQueryDto } from '../../common/dto/list-query.dto';

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ListCustomersQueryDto extends ListQueryDto {
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
    description: 'Filtra por cliente ativo/inativo',
    example: true
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({
    message: 'isActive deve ser booleano'
  })
  isActive?: boolean;
}
