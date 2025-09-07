import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";

import { errorHandler } from "@middlewares/errorHandler";
import mainRouter from "@routes/index";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, response) => {
  response.json({
    message: "Server is running",
    status: "OK",
  });
});

// Mount router on both root and /api for health check compatibility
app.use("/api", mainRouter);
app.use("/", mainRouter);

app.use(errorHandler);

export default app;
