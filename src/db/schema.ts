import { Prisma, Status, Label, Priority } from '@prisma/client'

// Ces exports permettent de garder la compatibilité avec le code existant
export type Task = Prisma.TaskGetPayload<{}>
export type NewTask = Prisma.TaskCreateInput

// Créer un objet tasks compatible avec l'ancien objet Drizzle pour maintenir la compatibilité
export const tasks = {
  status: {
    enumValues: ["todo", "in-progress", "done", "canceled"] as const
  },
  label: {
    enumValues: ["bug", "feature", "enhancement", "documentation"] as const
  },
  priority: {
    enumValues: ["low", "medium", "high"] as const
  }
} 