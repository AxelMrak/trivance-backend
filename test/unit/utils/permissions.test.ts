import {
  canEditAppointmentStatus,
  canEditAppointmentDate,
  canEditAppointmentDetails,
  RoleLevel,
} from "@/utils/permissions";

describe("permissions deny by default", () => {
  it("denies status edits when no actor is present", () => {
    expect(canEditAppointmentStatus(undefined, "owner-1")).toBe(false);
  });

  it("denies date edits when no actor is present", () => {
    expect(canEditAppointmentDate(undefined, "owner-1")).toBe(false);
  });

  it("denies detail edits when no actor is present", () => {
    expect(canEditAppointmentDetails(undefined, "owner-1")).toBe(false);
  });

  it("allows manager to edit any appointment status", () => {
    expect(
      canEditAppointmentStatus({ userId: "manager-1", role: RoleLevel.MANAGER }, "owner-1"),
    ).toBe(true);
  });

  it("allows staff to edit own appointment status", () => {
    expect(
      canEditAppointmentStatus({ userId: "staff-1", role: RoleLevel.STAFF }, "staff-1"),
    ).toBe(true);
  });

  it("denies client to edit appointment status", () => {
    expect(
      canEditAppointmentStatus({ userId: "client-1", role: RoleLevel.CLIENT }, "owner-1"),
    ).toBe(false);
  });
});
