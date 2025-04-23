import express from "express";
import { errorHandler } from "./middlewares/errorHandler";
import cors from "cors";
import mainRouter from "./routes";
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({
    message: "Server is running",
    status: "OK",
  });
});
app.use("/api", mainRouter);
app.use(errorHandler);

export default app;
