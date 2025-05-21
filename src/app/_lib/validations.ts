import { type Task, tasks } from "@/db/schema";
import { Status, Label, Priority } from "@prisma/client";
import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import * as z from "zod";

import { flagConfig } from "@/config/flag";
import { getFiltersStateParser, getSortingStateParser } from "@/lib/parsers";

// Schémas pour conversion entre interface utilisateur (in-progress) et Prisma (in_progress)
const statusEnumSchema = z.enum(tasks.status.enumValues).transform(value => 
  value === "in-progress" ? "in_progress" : value
);

const labelEnumSchema = z.enum(tasks.label.enumValues);
const priorityEnumSchema = z.enum(tasks.priority.enumValues);

export const searchParamsCache = createSearchParamsCache({
  filterFlag: parseAsStringEnum(
    flagConfig.featureFlags.map((flag) => flag.value),
  ),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  sort: getSortingStateParser<Task>().withDefault([
    { id: "createdAt", desc: true },
  ]),
  title: parseAsString.withDefault(""),
  status: parseAsArrayOf(z.enum(tasks.status.enumValues)).withDefault([]),
  priority: parseAsArrayOf(z.enum(tasks.priority.enumValues)).withDefault([]),
  estimatedHours: parseAsArrayOf(z.coerce.number()).withDefault([]),
  createdAt: parseAsArrayOf(z.coerce.number()).withDefault([]),
  // advanced filter
  filters: getFiltersStateParser().withDefault([]),
  joinOperator: parseAsStringEnum(["and", "or"]).withDefault("and"),
});

export const createTaskSchema = z.object({
  title: z.string(),
  label: labelEnumSchema,
  status: statusEnumSchema,
  priority: priorityEnumSchema,
  estimatedHours: z.coerce.number().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().optional(),
  label: labelEnumSchema.optional(),
  status: statusEnumSchema.optional(),
  priority: priorityEnumSchema.optional(),
  estimatedHours: z.coerce.number().optional(),
});

export type GetTasksSchema = Awaited<
  ReturnType<typeof searchParamsCache.parse>
>;
export type CreateTaskSchema = z.infer<typeof createTaskSchema>;
export type UpdateTaskSchema = z.infer<typeof updateTaskSchema>;
