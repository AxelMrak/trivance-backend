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
  if (!user) return false;
  // Managers and above can edit regardless of ownership
  if (typeof user.role === "number" && user.role >= RoleLevel.MANAGER) return true;
  if (!isStaffOrHigher(user.role)) return false;
  return user.userId === appointmentOwnerId;
};

export const canEditAppointmentDate = (
  user: { userId: string; role: number } | undefined,
  appointmentOwnerId: string,
): boolean => {
  if (!user) return false;
  if (typeof user.role === "number" && user.role >= RoleLevel.MANAGER) return true;
  if (!isStaffOrHigher(user.role)) return false;
  return user.userId === appointmentOwnerId;
};

export const canEditAppointmentDetails = (
  user: { userId: string; role: number } | undefined,
  appointmentOwnerId: string,
): boolean => {
  if (!user) return false;
  // Only the person who created/owns the appointment may edit details like description/service
  return user.userId === appointmentOwnerId;
};
