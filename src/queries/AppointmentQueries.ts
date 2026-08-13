export const generateGetAppointmentsWithJoinsQuery = (): string => {
  return `
    SELECT
      a.id,
      a.user_id,
      a.client_id,
      a.service_id,
      a.status,
      a.description,
      a.start_date,
      a.created_at,
      a.updated_at
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE s.company_id = $1
    ORDER BY a.start_date DESC
  `;
};

export const generateGetAppointmentByIdWithJoinsQuery = (): string => {
  return `
    SELECT
      a.id,
      a.user_id,
      a.client_id,
      a.service_id,
      a.status,
      a.description,
      a.start_date,
      a.created_at,
      a.updated_at
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.id = $1 AND s.company_id = $2
  `;
};
