import { UserRoles } from '../enums/UserRoles';
import { Item } from './Item';

/**
 * Represents a reservation for items
 */
export interface Reservation {
    reservationName: string,
    reservationId: number,
    description?: string,
    approvalRequired: boolean,
    approved?: boolean,
    responsible: string,
    itemIds: number[],
    startDate: number,
    plannedEndDate: number,
    completed: boolean,
    active?: boolean, // Only needed during runtime
}
