import { SubRequest } from './SubRequest';

/**
 * Represents a registration request
 */
export interface Request {
    requestId: number,
    itemIds?: number[], // items which were requested
    userCreated?: number, // this user could be assigned to a request operation
    startDate: number, // start date of the reservation reqeust
    plannedEndDate: number // end date of the reservation request
    note?: string, // notes provided by the user making the request
    subRequest?: SubRequest[], // Submitted subrequests - can be undefined
    deviceCount?: number, // Device count if request is simple request
    created: number,
    modified?: number,
    priority?: number,
}
