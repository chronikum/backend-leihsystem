/**
 * Represents a registration request
 */
export interface Request {
    requestId: number,
    itemIds?: number[], // items which were requested
    responsibleUserId: number, // the user responsible for the requested reservation
    assignedUserId?: number, // this user could be assigned to a request operation
    startDate: number, // start date of the reservation reqeust
    plannedEndDate: number // end date of the reservation request
    note?: string, // notes provided by the user making the request
    created: number,
    modified?: number,
    priority?: number,
}
