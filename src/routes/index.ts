import { Router } from "express";
import userRouter from "@routes/UserRoutes";
import authRouter from "@routes/AuthRoutes";

const router = Router();
router.get("/", (_req, res) => {
  res.json({
    message: "API is running",
    status: "OK",
  });
});
router.use("/users", userRouter);
router.use("/auth", authRouter);

export default router;
