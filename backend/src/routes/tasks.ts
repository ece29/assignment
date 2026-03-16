import { Prisma } from "@prisma/client";
import { Router } from "express";

import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { serializeTask } from "../utils/serializers.js";
import {
  createTaskSchema,
  taskQuerySchema,
  updateTaskSchema
} from "../validators/tasks.js";

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

tasksRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const userId = (request as AuthenticatedRequest).user!.id;
    const { page, pageSize, search, status } = taskQuerySchema.parse(request.query);
    const skip = (page - 1) * pageSize;

    const where: Prisma.TaskWhereInput = {
      userId,
      ...(search
        ? {
            title: {
              contains: search
            }
          }
        : {}),
      ...(status === "completed"
        ? { completed: true }
        : status === "pending"
          ? { completed: false }
          : {})
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize
      }),
      prisma.task.count({ where })
    ]);

    return response.json({
      items: tasks.map(serializeTask),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  })
);

tasksRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const userId = (request as AuthenticatedRequest).user!.id;
    const payload = createTaskSchema.parse(request.body);

    const task = await prisma.task.create({
      data: {
        userId,
        title: payload.title,
        description: payload.description || null
      }
    });

    return response.status(201).json({
      message: "Task created",
      task: serializeTask(task)
    });
  })
);

tasksRouter.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const userId = (request as AuthenticatedRequest).user!.id;
    const taskId = String(request.params.id);

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId
      }
    });

    if (!task) {
      return response.status(404).json({ message: "Task not found" });
    }

    return response.json({ task: serializeTask(task) });
  })
);

tasksRouter.patch(
  "/:id",
  asyncHandler(async (request, response) => {
    const userId = (request as AuthenticatedRequest).user!.id;
    const payload = updateTaskSchema.parse(request.body);
    const taskId = String(request.params.id);

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId
      }
    });

    if (!task) {
      return response.status(404).json({ message: "Task not found" });
    }

    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.description !== undefined
          ? { description: payload.description || null }
          : {}),
        ...(payload.completed !== undefined ? { completed: payload.completed } : {})
      }
    });

    return response.json({
      message: "Task updated",
      task: serializeTask(updatedTask)
    });
  })
);

tasksRouter.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const userId = (request as AuthenticatedRequest).user!.id;
    const taskId = String(request.params.id);

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId
      }
    });

    if (!task) {
      return response.status(404).json({ message: "Task not found" });
    }

    await prisma.task.delete({
      where: { id: task.id }
    });

    return response.json({ message: "Task deleted" });
  })
);

tasksRouter.patch(
  "/:id/toggle",
  asyncHandler(async (request, response) => {
    const userId = (request as AuthenticatedRequest).user!.id;
    const taskId = String(request.params.id);

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId
      }
    });

    if (!task) {
      return response.status(404).json({ message: "Task not found" });
    }

    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: {
        completed: !task.completed
      }
    });

    return response.json({
      message: "Task status updated",
      task: serializeTask(updatedTask)
    });
  })
);
