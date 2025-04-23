import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler";
import mainRouter from "./routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, response) => {
  response.json({
    message: "Server is running",
    status: "OK",
  });
});

app.use("/api", mainRouter);

app.use(errorHandler);

export default app;
