import "server-only";

import { prisma } from '@/db';
import { Prisma } from '@prisma/client';
import { unstable_cache } from "@/lib/unstable-cache";

import type { GetTasksSchema } from "./validations";

export async function getTasks(input: GetTasksSchema) {
  return await unstable_cache(
    async () => {
      try {
        const skip = (input.page - 1) * input.perPage;
        const advancedTable =
          input.filterFlag === "advancedFilters" ||
          input.filterFlag === "commandFilters";

        // Construction dynamique des conditions de filtrage
        let whereCondition: Prisma.TaskWhereInput = {};

        if (advancedTable) {
          // Gestion des filtres avancés
          whereCondition = buildAdvancedFilters(input.filters, input.joinOperator);
        } else {
          // Filtres standards
          if (input.title) {
            whereCondition.title = {
              contains: input.title,
              mode: 'insensitive',
            };
          }

          if (input.status && input.status.length > 0) {
            whereCondition.status = {
              in: input.status.map(s => s === "in-progress" ? "in_progress" : s),
            };
          }

          if (input.priority && input.priority.length > 0) {
            whereCondition.priority = {
              in: input.priority,
            };
          }

          if (input.estimatedHours && input.estimatedHours.length > 0) {
            if (input.estimatedHours[0] !== undefined) {
              whereCondition.estimatedHours = {
                ...(whereCondition.estimatedHours || {}),
                gte: input.estimatedHours[0],
              };
            }
            if (input.estimatedHours[1] !== undefined) {
              whereCondition.estimatedHours = {
                ...(whereCondition.estimatedHours || {}),
                lte: input.estimatedHours[1],
              };
            }
          }

          if (input.createdAt && input.createdAt.length > 0) {
            if (input.createdAt[0] !== undefined) {
              const startDate = new Date(input.createdAt[0]);
              startDate.setHours(0, 0, 0, 0);
              whereCondition.createdAt = {
                ...(whereCondition.createdAt || {}),
                gte: startDate,
              };
            }
            if (input.createdAt[1] !== undefined) {
              const endDate = new Date(input.createdAt[1]);
              endDate.setHours(23, 59, 59, 999);
              whereCondition.createdAt = {
                ...(whereCondition.createdAt || {}),
                lte: endDate,
              };
            }
          }
        }

        // Déterminer le tri
        const orderBy: any[] = input.sort.map((sort) => ({
          [sort.id]: sort.desc ? 'desc' : 'asc',
        }));

        // Exécuter la requête pour obtenir les données
        const tasks = await prisma.task.findMany({
          where: whereCondition,
          skip,
          take: input.perPage,
          orderBy: orderBy.length > 0 ? orderBy : undefined,
        });

        // Adapter le format des données pour la compatibilité
        const adaptedTasks = tasks.map(task => ({
          ...task,
          status: task.status === "in_progress" ? "in-progress" : task.status,
        }));

        // Compter le nombre total d'enregistrements pour la pagination
        const totalCount = await prisma.task.count({
          where: whereCondition,
        });

        return {
          data: adaptedTasks,
          pageCount: Math.ceil(totalCount / input.perPage),
        };
      } catch (err) {
        console.error("Error fetching tasks:", err);
        return {
          data: [],
          pageCount: 0,
        };
      }
    },
    [`tasks-${JSON.stringify(input)}`],
    {
      revalidate: 10,
      tags: ["tasks"],
    },
  )();
}

export async function getTaskStatusCounts() {
  return unstable_cache(
    async () => {
      try {
        // Récupérer les comptages regroupés par statut
        const counts = await prisma.task.groupBy({
          by: ['status'],
          _count: {
            status: true,
          },
          having: {
            status: {
              _count: {
                gt: 0,
              },
            },
          },
        });

        // Convertir le résultat au format attendu
        const result = {
          todo: 0,
          "in-progress": 0,
          done: 0,
          canceled: 0,
        };

        counts.forEach(item => {
          // Convertir in_progress à in-progress pour la compatibilité
          const status = item.status === "in_progress" ? "in-progress" : item.status;
          result[status as keyof typeof result] = item._count.status;
        });

        return result;
      } catch (_err) {
        return {
          todo: 0,
          "in-progress": 0,
          done: 0,
          canceled: 0,
        };
      }
    },
    ["task-status-counts"],
    {
      revalidate: 3600,
      tags: ["task-status-counts"],
    },
  )();
}

export async function getTaskPriorityCounts() {
  return unstable_cache(
    async () => {
      try {
        // Récupérer les comptages regroupés par priorité
        const counts = await prisma.task.groupBy({
          by: ['priority'],
          _count: {
            priority: true,
          },
          having: {
            priority: {
              _count: {
                gt: 0,
              },
            },
          },
        });

        // Convertir le résultat au format attendu
        const result = {
          low: 0,
          medium: 0,
          high: 0,
        };

        counts.forEach(item => {
          result[item.priority as keyof typeof result] = item._count.priority;
        });

        return result;
      } catch (_err) {
        return {
          low: 0,
          medium: 0,
          high: 0,
        };
      }
    },
    ["task-priority-counts"],
    {
      revalidate: 3600,
      tags: ["task-priority-counts"],
    },
  )();
}

export async function getEstimatedHoursRange() {
  return unstable_cache(
    async () => {
      try {
        // Trouver la valeur minimale d'heures estimées
        const minResult = await prisma.task.aggregate({
          _min: {
            estimatedHours: true,
          },
        });

        // Trouver la valeur maximale d'heures estimées
        const maxResult = await prisma.task.aggregate({
          _max: {
            estimatedHours: true,
          },
        });

        return {
          min: minResult._min.estimatedHours || 0,
          max: maxResult._max.estimatedHours || 0,
        };
      } catch (_err) {
        return {
          min: 0,
          max: 0,
        };
      }
    },
    ["estimated-hours-range"],
    {
      revalidate: 3600,
    },
  )();
}

// Fonction utilitaire pour construire les filtres avancés
function buildAdvancedFilters(
  filters: any[],
  joinOperator: 'and' | 'or'
): Prisma.TaskWhereInput {
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