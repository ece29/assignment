import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { authRouter } from "./routes/auth.js";
import { tasksRouter } from "./routes/tasks.js";

export const app = express();

app.use(
  cors({
    origin: config.clientUrl,
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/tasks", tasksRouter);

app.use(notFoundHandler);
app.use(errorHandler);
