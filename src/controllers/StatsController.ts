import { Response, NextFunction } from "express";
import { AuthRequest } from "@/middlewares/authmiddleware";
import { StatsService } from "@/services/StatsService";

export class StatsController {
  constructor(private statsService: StatsService) {}

  getAppointmentSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.statsService.getAppointmentSummary(req.user!);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };

  getMostUsedService = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const includeParam = (req.query.include as string) || "";
      const includeParts = includeParam
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const include = { service: includeParts.includes("service") };

      const data = await this.statsService.getMostUsedService(req.user!, include);
      if (!data) {
        res.status(200).json(null);
        return;
      }

      // If service is included, drop service_id (normalized expansion as in appointments)
      if ((data as any).service) {
        const { service, usage_count } = data as any;
        res.status(200).json({ usage_count, service });
        return;
      }

      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };
}

