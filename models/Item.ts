import { UserRoles } from '../enums/UserRoles';
import { Reservation } from './Reservation';

/**
 * Describes Item used in inventory
 * - also describes the ownership and the availability
 * - an item holds all the reservations ids which were applied before
 */
export interface Item {
    name: string, // Device name
    internalName?: string,
    serialNumber?: string,
    creationDate: number,
    modificationDate?: number,
    description?: string,
    caIdentifier?: string, // ZfM asset tag
    model?: string,
    notes?: string,
    managed: boolean,
    available: boolean,
    plannedReservationsIds?: number[],
    itemId: number,
    currentReservationId?: string,
    generatedUniqueIdentifier: string, // The string which identifies the device and will be on the qr code
    modelIdentifier?: number, // the associated device model id
}
