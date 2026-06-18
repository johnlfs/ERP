import { BadRequestException } from '@nestjs/common';

export type PaginationQuery = {
  page?: string | number;
  pageSize?: string | number;
};

export type ParsedPagination = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePositiveInteger(
  value: string | number | undefined,
  field: 'page' | 'pageSize',
  fallback: number
): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException({
      code: 'INVALID_PAGINATION_PARAM',
      message: `Query param "${field}" deve ser um número inteiro positivo`,
      details: {
        field,
        value
      }
    });
  }

  return parsed;
}

export function parsePagination(query: PaginationQuery): ParsedPagination {
  const page = parsePositiveInteger(query.page, 'page', DEFAULT_PAGE);

  const requestedPageSize = parsePositiveInteger(
    query.pageSize,
    'pageSize',
    DEFAULT_PAGE_SIZE
  );

  if (requestedPageSize > MAX_PAGE_SIZE) {
    throw new BadRequestException({
      code: 'PAGE_SIZE_TOO_LARGE',
      message: `Query param "pageSize" deve ser no máximo ${MAX_PAGE_SIZE}`,
      details: {
        field: 'pageSize',
        value: requestedPageSize,
        max: MAX_PAGE_SIZE
      }
    });
  }

  return {
    page,
    pageSize: requestedPageSize,
    skip: (page - 1) * requestedPageSize,
    take: requestedPageSize
  };
}

export function createPaginationMeta(
  total: number,
  currentCount: number,
  pagination: ParsedPagination,
  extra?: Record<string, unknown>
) {
  const pageCount = Math.ceil(total / pagination.pageSize);

  return {
    count: currentCount,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    pageCount,
    hasNextPage: pagination.page < pageCount,
    hasPreviousPage: pagination.page > 1,
    ...(extra ?? {})
  };
}
