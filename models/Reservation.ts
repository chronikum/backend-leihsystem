import { UserRoles } from '../enums/UserRoles';
import { Item } from './Item';

/**
 * Represents a reservation for items
 */
export interface Reservation {
    reservationName: string,
    description?: string,
    approvalRequired: boolean,
    approved?: boolean,
    responsible: string,
    itemIds: Item[],
    startDate: number,
    plannedEndDate: number,
    completed: boolean,
}
