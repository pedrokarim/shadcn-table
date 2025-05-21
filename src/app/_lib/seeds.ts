import { prisma } from '@/db';
import type { Task } from '@prisma/client';

import { generateRandomTask } from "./utils";

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