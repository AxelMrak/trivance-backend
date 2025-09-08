export const RoleLevel = {
  GUEST: 0,
  CLIENT: 1,
  STAFF: 2,
  MANAGER: 3,
  ADMIN: 4,
  SUPER_USER: 5,
} as const;

export const isStaffOrHigher = (level: number | undefined | null): boolean => {
  return typeof level === "number" && level >= RoleLevel.STAFF;
};

export const canEditAppointmentStatus = (
  user: { userId: string; role: number } | undefined,
  appointmentOwnerId: string,
): boolean => {
  if (!user) return true; // system/internal flows
  if (!isStaffOrHigher(user.role)) return false;
  return user.userId === appointmentOwnerId;
};

