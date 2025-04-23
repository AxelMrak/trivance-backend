import { Router } from "express";
import userRouter from "./UserRoutes";
import authRouter from "./AuthRoutes";
const router = Router();

router.use("/users", userRouter);
router.use("/auth", authRouter);
export default router;
