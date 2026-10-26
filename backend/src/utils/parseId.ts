import { ApiError } from './ApiError';

export function parseId(value: unknown, label = 'id'): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw ApiError.badRequest(`Invalid ${label}.`);
  return n;
}
