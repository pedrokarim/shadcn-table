import type { ExtendedColumnFilter, JoinOperator } from "@/types/data-table";
import { Prisma } from '@prisma/client';

// Fonction pour construire des filtres dynamiques pour Prisma
export function filterColumns({
  filters,
  joinOperator,
}: {
  filters: ExtendedColumnFilter<any>[];
  joinOperator: JoinOperator;
}): Prisma.TaskWhereInput {
  if (!filters || filters.length === 0) {
    return {};
  }

  const conditions = filters.map(filter => {
    const column = filter.id;
    
    switch (filter.operator) {
      case "iLike":
        if (filter.variant === "text" && typeof filter.value === "string") {
          return {
            [column]: {
              contains: filter.value,
              mode: 'insensitive',
            },
          };
        }
        break;
        
      case "notILike":
        if (filter.variant === "text" && typeof filter.value === "string") {
          return {
            [column]: {
              not: {
                contains: filter.value,
                mode: 'insensitive',
              },
            },
          };
        }
        break;
        
      case "eq":
        if (column === "status" && filter.value === "in-progress") {
          return { status: "in_progress" };
        }
        
        if (filter.variant === "boolean" && typeof filter.value === "string") {
          return { [column]: filter.value === "true" };
        }
        
        if (filter.variant === "date" || filter.variant === "dateRange") {
          const date = new Date(Number(filter.value));
          date.setHours(0, 0, 0, 0);
          const end = new Date(date);
          end.setHours(23, 59, 59, 999);
          return {
            [column]: {
              gte: date,
              lte: end,
            },
          };
        }
        
        return { [column]: filter.value };
        
      case "ne":
        if (column === "status" && filter.value === "in-progress") {
          return { status: { not: "in_progress" } };
        }
        return { [column]: { not: filter.value } };
        
      case "gt":
        return { [column]: { gt: filter.value } };
        
      case "gte":
        return { [column]: { gte: filter.value } };
        
      case "lt":
        return { [column]: { lt: filter.value } };
        
      case "lte":
        return { [column]: { lte: filter.value } };
        
      case "in":
        if (column === "status") {
          return {
            [column]: {
              in: Array.isArray(filter.value) 
                ? filter.value.map((v: string) => v === "in-progress" ? "in_progress" : v)
                : filter.value,
            },
          };
        }
        return {
          [column]: {
            in: filter.value,
          },
        };
        
      case "notIn":
        if (column === "status") {
          return {
            [column]: {
              notIn: Array.isArray(filter.value) 
                ? filter.value.map((v: string) => v === "in-progress" ? "in_progress" : v)
                : filter.value,
            },
          };
        }
        return {
          [column]: {
            notIn: filter.value,
          },
        };
        
      case "isEmpty":
        return {
          OR: [
            { [column]: null },
            { [column]: "" },
            ...(Array.isArray(filter.value) ? [{ [column]: [] }] : []),
          ],
        };
        
      case "isNotEmpty":
        return {
          NOT: {
            OR: [
              { [column]: null },
              { [column]: "" },
              ...(Array.isArray(filter.value) ? [{ [column]: [] }] : []),
            ],
          },
        };
    }
    
    return {};
  }).filter(condition => Object.keys(condition).length > 0);

  if (conditions.length === 0) {
    return {};
  }

  return {
    [joinOperator]: conditions,
  };
} 