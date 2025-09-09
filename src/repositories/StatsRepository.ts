import { dbClient } from "@/config/db";

export class StatsRepository {
  async getAppointmentStatusSummaryByCompany(companyId: string): Promise<{
    total: number;
    confirmed: number;
    pending: number;
    cancelled: number;
  }> {
    const query = `
      WITH filtered AS (
        SELECT a.status
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        WHERE s.company_id = $1
      )
      SELECT
        (SELECT COUNT(*)::int FROM filtered) AS total,
        (SELECT COUNT(*)::int FROM filtered WHERE status = 'confirmed') AS confirmed,
        (SELECT COUNT(*)::int FROM filtered WHERE status = 'pending')   AS pending,
        (SELECT COUNT(*)::int FROM filtered WHERE status = 'cancelled') AS cancelled
    `;
    const result = await dbClient.query(query, [companyId]);
    return result.rows[0] || { total: 0, confirmed: 0, pending: 0, cancelled: 0 };
  }

  async getMostUsedServiceByCompany(
    companyId: string,
  ): Promise<{ service_id: string; usage_count: number } | null> {
    const query = `
      SELECT a.service_id, COUNT(*)::int AS usage_count
      FROM appointments a
      JOIN services s ON s.id = a.service_id
      WHERE s.company_id = $1
      GROUP BY a.service_id
      ORDER BY usage_count DESC
      LIMIT 1
    `;
    const result = await dbClient.query(query, [companyId]);
    return result.rows[0] || null;
  }
}
