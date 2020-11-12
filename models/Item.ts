import { ItemOwnership } from '../enums/ItemOwnership';

/**
 * Describes Item used in inventory
 * - also describes the ownership and the availability
 */
export interface Item {
    name: string, // Device name
    internalName?: string,
    serialNumber?: string,
    ownership: ItemOwnership,
    ownershipIdentifier: string,
    creationDate: number,
    modificationDate?: number,
    description?: string,
    model?: string,
    notes?: string,
    available: boolean,
    startDate: number,
    plannedEndDate: number,
}
