import type { AppointmentService, AppointmentCreateInput, AppointmentRecord } from "./appointment-service";
import type { DomainEventBus } from "./domain-event-bus";
import { createDomainEvent } from "./domain-event";

export function createAppointmentEventEmitter(
  service: AppointmentService,
  eventBus: DomainEventBus,
): AppointmentService {
  return {
    async createAppointment(input: AppointmentCreateInput): Promise<AppointmentRecord> {
      const appointment = await service.createAppointment(input);
      await eventBus.publish(
        createDomainEvent("appointment.created", appointment.tenantId, {
          appointmentId: appointment.id,
          customerId: appointment.customerId,
          serviceId: appointment.serviceId,
          branchId: appointment.branchId,
          startsAt: appointment.startsAt.toISOString(),
          endsAt: appointment.endsAt.toISOString(),
          status: appointment.status,
        }),
      );
      return appointment;
    },

    async getAppointment(args) {
      return service.getAppointment(args);
    },

    async listAppointments(args) {
      return service.listAppointments(args);
    },

    async updateAppointment(args) {
      return service.updateAppointment(args);
    },
  };
}
