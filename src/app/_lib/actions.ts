"use server";

import { prisma } from '@/db';
import type { Task } from '@prisma/client';
import { customAlphabet } from "nanoid";
import { revalidateTag, unstable_noStore } from "next/cache";

import { getErrorMessage } from "@/lib/handle-error";

import { generateRandomTask } from "./utils";
import type { CreateTaskSchema, UpdateTaskSchema } from "./validations";

export async function seedTasks(input: { count: number }) {
  const count = input.count ?? 100;

  try {
    const allTasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    for (let i = 0; i < count; i++) {
      const task = generateRandomTask();
      // Adapter la tâche générée pour la compatibilité avec Prisma
      allTasks.push({
        code: task.code,
        title: task.title,
        status: task.status === "in-progress" ? "in_progress" : task.status,
        label: task.label,
        priority: task.priority,
        estimatedHours: task.estimatedHours,
        archived: task.archived,
      });
    }

    // Supprimer toutes les tâches existantes
    await prisma.task.deleteMany({});

    console.log("📝 Inserting tasks", allTasks.length);

    // Insertion des nouvelles tâches
    await prisma.$transaction(
      allTasks.map(task => 
        prisma.task.create({
          data: task
        })
      )
    );
  } catch (err) {
    console.error(err);
  }
}

export async function createTask(input: CreateTaskSchema) {
  unstable_noStore();
  try {
    // Utilisation de la transaction Prisma
    await prisma.$transaction(async (tx) => {
      // Création de la nouvelle tâche
      const newTask = await tx.task.create({
        data: {
          code: `TASK-${customAlphabet("0123456789", 4)()}`,
          title: input.title,
          status: input.status === "in-progress" ? "in_progress" : input.status,
          label: input.label,
          priority: input.priority,
        },
        select: {
          id: true,
        },
      });

      // Recherche de la tâche la plus ancienne à supprimer
      const oldestTask = await tx.task.findFirst({
        where: {
          id: {
            not: newTask.id,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
        },
      });

      // Suppression de la tâche la plus ancienne
      if (oldestTask) {
        await tx.task.delete({
          where: {
            id: oldestTask.id,
          },
        });
      }
    });

    revalidateTag("tasks");
    revalidateTag("task-status-counts");
    revalidateTag("task-priority-counts");

    return {
      data: null,
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: getErrorMessage(err),
    };
  }
}

export async function updateTask(input: UpdateTaskSchema & { id: string }) {
  unstable_noStore();
  try {
    // Récupération de l'état actuel de la tâche
    const oldTask = await prisma.task.findUnique({
      where: { id: input.id },
      select: { status: true, priority: true },
    });

    if (!oldTask) {
      throw new Error("Task not found");
    }

    // Mise à jour de la tâche
    const data = await prisma.task.update({
      where: { id: input.id },
      data: {
        title: input.title,
        label: input.label,
        status: input.status === "in-progress" ? "in_progress" : input.status,
        priority: input.priority,
      },
      select: {
        status: true,
        priority: true,
      },
    });

    revalidateTag("tasks");
    
    // Convertir le statut Prisma pour la comparaison
    const statusForComparison = data.status === "in_progress" ? "in-progress" : data.status;
    const inputStatusForComparison = input.status;
    
    if (statusForComparison !== inputStatusForComparison) {
      revalidateTag("task-status-counts");
    }
    
    if (data.priority !== input.priority) {
      revalidateTag("task-priority-counts");
    }

    return {
      data: null,
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: getErrorMessage(err),
    };
  }
}

export async function updateTasks(input: {
  ids: string[];
  label?: Task["label"];
  status?: string;
  priority?: Task["priority"];
}) {
  unstable_noStore();
  try {
    // Convertir le statut si nécessaire
    const status = input.status === "in-progress" ? "in_progress" : input.status;
    
    // Mise à jour de toutes les tâches sélectionnées
    const updates = await Promise.all(
      input.ids.map((id) =>
        prisma.task.update({
          where: { id },
          data: {
            label: input.label,
            status: status as any, // Conversion nécessaire car l'énumération peut être différente
            priority: input.priority,
          },
          select: {
            status: true,
            priority: true,
          },
        })
      )
    );

    // Récupération de la première tâche mise à jour pour vérifier les changements
    const data = updates[0];

    revalidateTag("tasks");
    
    // Convertir le statut Prisma pour la comparaison
    const statusForComparison = data?.status === "in_progress" ? "in-progress" : data?.status;
    const inputStatusForComparison = input.status;
    
    if (data && statusForComparison === inputStatusForComparison) {
      revalidateTag("task-status-counts");
    }
    
    if (data && data.priority === input.priority) {
      revalidateTag("task-priority-counts");
    }

    return {
      data: null,
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: getErrorMessage(err),
    };
  }
}

export async function deleteTask(input: { id: string }) {
  unstable_noStore();
  try {
    await prisma.$transaction(async (tx) => {
      // Suppression de la tâche
      await tx.task.delete({
        where: { id: input.id },
      });

      // Création d'une nouvelle tâche aléatoire
      const randomTask = generateRandomTask();
      await tx.task.create({
        data: {
          code: randomTask.code,
          title: randomTask.title,
          status: randomTask.status === "in-progress" ? "in_progress" : randomTask.status,
          label: randomTask.label,
          priority: randomTask.priority,
          estimatedHours: randomTask.estimatedHours,
          archived: randomTask.archived,
        },
      });
    });

    revalidateTag("tasks");
    revalidateTag("task-status-counts");
    revalidateTag("task-priority-counts");

    return {
      data: null,
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: getErrorMessage(err),
    };
  }
}

export async function deleteTasks(input: { ids: string[] }) {
  unstable_noStore();
  try {
    await prisma.$transaction(async (tx) => {
      // Suppression des tâches
      await tx.task.deleteMany({
        where: { id: { in: input.ids } },
      });

      // Création de nouvelles tâches aléatoires pour remplacer celles supprimées
      const randomTasks = input.ids.map(() => {
        const task = generateRandomTask();
        return {
          code: task.code,
          title: task.title,
          status: task.status === "in-progress" ? "in_progress" : task.status,
          label: task.label,
          priority: task.priority,
          estimatedHours: task.estimatedHours,
          archived: task.archived,
        };
      });

      // Insertion des nouvelles tâches
      await Promise.all(
        randomTasks.map((task) =>
          tx.task.create({ data: task })
        )
      );
    });

    revalidateTag("tasks");
    revalidateTag("task-status-counts");
    revalidateTag("task-priority-counts");

    return {
      data: null,
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: getErrorMessage(err),
    };
  }
} 