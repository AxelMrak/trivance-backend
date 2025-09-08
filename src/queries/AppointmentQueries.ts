export const generateGetAppointmentsWithJoinsQuery = (): string => {
  // Normalized response: only appointment fields, no nested user/service objects
  return `
    SELECT
      a.id,
      a.user_id,
      a.service_id,
      a.status,
      a.description,
      a.start_date,
      a.created_at,
      a.updated_at
    FROM appointments a
    ORDER BY a.start_date DESC
  `;
};

export const generateGetAppointmentByIdWithJoinsQuery = (): string => {
  // Normalized response: only appointment fields, no nested user/service objects
  return `
    SELECT
      a.id,
      a.user_id,
      a.service_id,
      a.status,
      a.description,
      a.start_date,
      a.created_at,
      a.updated_at
    FROM appointments a
    WHERE a.id = $1
  `;
};
