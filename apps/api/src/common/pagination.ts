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

function toPositiveInteger(
  value: string | number | undefined,
  fallback: number
): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function parsePagination(query: PaginationQuery): ParsedPagination {
  const page = toPositiveInteger(query.page, DEFAULT_PAGE);

  const requestedPageSize = toPositiveInteger(
    query.pageSize,
    DEFAULT_PAGE_SIZE
  );

  const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize
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
