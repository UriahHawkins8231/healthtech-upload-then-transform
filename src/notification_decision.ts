export type Appointment = { status: "scheduled" | "confirmed" | "cancelled"; patientName: string; startsAt: string };
export function notificationFor(appointment: Appointment): string | null {
  if (appointment.status === "confirmed") return `Appointment confirmed for ${appointment.patientName} at ${appointment.startsAt}`;
  if (appointment.status === "cancelled") return `Appointment cancelled for ${appointment.patientName}`;
  return null;
}
