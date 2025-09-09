import { StatsRepository } from "@/repositories/StatsRepository";
import { UserRepository } from "@/repositories/UserRepository";
import { ServiceHandlerService } from "@/services/ServiceHandlerService";

export class StatsService {
  constructor(
    private statsRepository: StatsRepository,
    private userRepository: UserRepository,
    private serviceHandlerService: ServiceHandlerService,
  ) {}

  private async getCompanyIdForUser(userId: string): Promise<string> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error("Usuario no encontrado");
    return (user as any).company_id as string;
  }

  async getAppointmentSummary(currentUser: { userId: string }): Promise<{
    total: number;
    confirmed: number;
    pending: number;
    cancelled: number;
  }> {
    const companyId = await this.getCompanyIdForUser(currentUser.userId);
    return this.statsRepository.getAppointmentStatusSummaryByCompany(companyId);
  }

  async getMostUsedService(currentUser: { userId: string }, include?: { service?: boolean }) {
    const companyId = await this.getCompanyIdForUser(currentUser.userId);
    const data = await this.statsRepository.getMostUsedServiceByCompany(companyId);
    if (!data) return null;

    if (include?.service) {
      const service = await this.serviceHandlerService.getServiceById(data.service_id);
      return {
        usage_count: data.usage_count,
        service,
      } as any;
    }
    return data;
  }
}
