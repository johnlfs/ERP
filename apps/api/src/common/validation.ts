import { BadRequestException } from '@nestjs/common';

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidLike(value: string): boolean {
  return UUID_LIKE_REGEX.test(value);
}

export function validateUuidParam(value: string, field = 'id'): string {
  if (!value || !isUuidLike(value)) {
    throw new BadRequestException({
      code: 'INVALID_UUID_PARAM',
      message: `Parâmetro "${field}" deve ser um UUID válido`,
      details: {
        field,
        value
      }
    });
  }

  return value;
}

export function validateOptionalUuidQuery(
  value: string | undefined,
  field: string
): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (!isUuidLike(value)) {
    throw new BadRequestException({
      code: 'INVALID_UUID_QUERY',
      message: `Query param "${field}" deve ser um UUID válido`,
      details: {
        field,
        value
      }
    });
  }

  return value;
}

export function normalizeSearch(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  if (!normalized) {
    return undefined;
  }

  return normalized;
}
