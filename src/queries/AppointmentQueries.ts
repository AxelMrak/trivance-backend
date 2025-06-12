export const generateGetAppointmentsWithJoinsQuery = (): string => {
  return `
    SELECT
      a.*,
      json_build_object('id', u.id, 'name', u.name) AS user,
      json_build_object(
        'id', s.id,
        'name', s.name,
        'description', s.description,
        'duration', s.duration,
        'price', s.price
      ) AS service
    FROM appointments a
    JOIN users u ON a.user_id = u.id
    JOIN services s ON a.service_id = s.id
    ORDER BY a.start_date DESC
  `;
};

export const generateGetAppointmentByIdWithJoinsQuery = (): string => {
  return `
    SELECT
      a.*,
      json_build_object('id', u.id, 'name', u.name) AS user,
      json_build_object(
        'id', s.id,
        'name', s.name,
        'description', s.description,
        'duration', s.duration,
        'price', s.price
      ) AS service
    FROM appointments a
    JOIN users u ON a.user_id = u.id
    JOIN services s ON a.service_id = s.id
    WHERE a.id = $1
  `;
};
