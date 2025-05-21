-- CreateEnum
CREATE TYPE "Status" AS ENUM ('todo', 'in-progress', 'done', 'canceled');

-- CreateEnum
CREATE TYPE "Label" AS ENUM ('bug', 'feature', 'enhancement', 'documentation');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "shadcn_tasks" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT,
    "status" "Status" NOT NULL DEFAULT 'todo',
    "label" "Label" NOT NULL DEFAULT 'bug',
    "priority" "Priority" NOT NULL DEFAULT 'low',
    "estimated_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shadcn_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shadcn_tasks_code_key" ON "shadcn_tasks"("code");
