/**
 * EmailNotificationService
 * TODO: Integrate with internal mailer service (another repo in docker).
 * For now, these methods are placeholders to be replaced with an HTTP call
 * to the mailer endpoint, e.g., POST http://mailer:3000/api/notify ...
 */
export type AppointmentEmailPayload = {
  appointmentId: string;
  userId: string;
  type: "status_changed" | "date_changed" | "reminder";
  metadata?: Record<string, unknown>;
};

export class EmailNotificationService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async notify(_payload: AppointmentEmailPayload): Promise<void> {
    // TODO: Implement call to mailer service inside docker network.
    // Example:
    // await fetch(process.env.MAILER_URL + '/notifications', { method: 'POST', body: JSON.stringify(payload) })
    return;
  }

  static async notifyStatusChanged(appointmentId: string, userId: string, status: string) {
    await this.notify({ appointmentId, userId, type: "status_changed", metadata: { status } });
  }

  static async notifyDateChanged(appointmentId: string, userId: string, startDateISO: string) {
    await this.notify({ appointmentId, userId, type: "date_changed", metadata: { startDateISO } });
  }

  static async sendReminder(appointmentId: string, userId: string) {
    await this.notify({ appointmentId, userId, type: "reminder" });
  }
}
