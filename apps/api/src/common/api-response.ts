export type ApiResponse<T> = {
  status: 'ok';
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
};

export function apiResponse<T>(
  data: T,
  meta?: Record<string, unknown>
): ApiResponse<T> {
  return {
    status: 'ok',
    data,
    ...(meta ? { meta } : {}),
    timestamp: new Date().toISOString()
  };
}

export function apiListResponse<T>(
  data: T[],
  meta?: Record<string, unknown>
): ApiResponse<T[]> {
  return apiResponse(data, {
    count: data.length,
    ...(meta ?? {})
  });
}
