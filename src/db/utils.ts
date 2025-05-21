import { databasePrefix } from "@/lib/constants";
import type { Prisma } from '@prisma/client';

export function tableWithPrefix(name: string) {
  return `${databasePrefix}_${name}`;
}

export function takeFirstOrNull<TData>(data: TData[]) {
  return data[0] ?? null;
}

export function takeFirstOrThrow<TData>(data: TData[], errorMessage?: string) {
  const first = takeFirstOrNull(data);

  if (!first) {
    throw new Error(errorMessage ?? "Item not found");
  }

  return first;
}

export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  return false;
} 