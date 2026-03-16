import type { Task, User } from "@prisma/client";

export function serializeUser(user: Pick<User, "id" | "name" | "email" | "createdAt">) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

export function serializeTask(task: Task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    completed: task.completed,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  };
}
