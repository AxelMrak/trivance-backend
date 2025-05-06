import { Router } from "express";
import userRouter from "@routes/UserRoutes";
import authRouter from "@routes/AuthRoutes";

const router = Router();

router.use("/users", userRouter);
router.use("/auth", authRouter);
export default router;
