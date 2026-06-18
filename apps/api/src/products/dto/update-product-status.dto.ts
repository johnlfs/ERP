import { ProductStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductStatusDto {
  @ApiProperty({
    description: 'Status do produto',
    enum: ProductStatus,
    example: ProductStatus.INACTIVE
  })
  @IsEnum(ProductStatus, {
    message: 'status deve ser um status de produto válido'
  })
  status!: ProductStatus;
}
