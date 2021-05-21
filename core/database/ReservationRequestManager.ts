import { Item } from '../../models/Item';
import RequestModel from '../../models/mongodb-models/RequestModel';
import { Reservation } from '../../models/Reservation';
import { Request } from '../../models/Request';
import AvailabilityManager from './AvailabilityManager';

export default class ReservationRequestManager {
    /**
     * Instance logic
     */
    static instance = ReservationRequestManager.getInstance();

    public static getInstance(): ReservationRequestManager {
        if (!ReservationRequestManager.instance) {
            ReservationRequestManager.instance = new ReservationRequestManager();
        }

        return ReservationRequestManager.instance;
    }

    /**
     * Create a new request
     * @param request to create
     *
     * @returns created request or failure
     */
    async createNewRequest(request: Request): Promise<Request> {
        const requestCount = await RequestModel.countDocuments({});
        const highestId: number = requestCount === 0 ? 0 : ((((await RequestModel.find()
            .sort({ requestId: -1 })
            .limit(1)) as unknown as Request[])[0].requestId || 0) as number);

        const creationDate = Date.now();
        // Create new RequestModel from mongoose Schema
        const newRequest = new RequestModel({
            requestId: (highestId + 1),
            userCreated: request.userCreated, // this user could be assigned to a request operation
            startDate: request.startDate, // start date of the reservation reqeust
            plannedEndDate: request.plannedEndDate, // end date of the reservation request
            note: request.note, // notes provided by the user making the request
            subRequest: request.subRequest, // Submitted subrequests - can be undefined
            deviceCount: request.deviceCount, // Device count if request is simple request
            created: creationDate,
            modified: 0, // TODO: Implement in request update
            priority: 0,
            requestAccepted: false,
        });
        // Save model
        await newRequest.save().catch((err) => {
            console.log(`Catched error: ${err}`);
        });
        // Verify model was saved
        const requestCreated = await RequestModel.findOne({ requestId: request.requestId }) as unknown as Request;
        // Return the Request
        return Promise.resolve(requestCreated);
    }

    /**
     * Update request
     *
     * @param request provided by user
     * @returns updated Request
     */
    async updateRequest(request: Request) {
        RequestModel.updateOne({ requestId: request.requestId }, { request }).exec();
        const requestUpdated = await RequestModel.findOne({ requestId: request.requestId }) as unknown as Request;
        // Return the updated Request
        return Promise.resolve(requestUpdated);
    }

    /**
     * Cancels request
     *
     * @param request provided by user
     * @returns updated Request
     */
    async cancelRequest(request: Request) {
        await RequestModel.findOneAndDelete({ requestId: request.requestId }).exec();
    }

    /**
     * Will accept a request and set a property which will block it from be displayed under allRequests endpoint
     *
     * @param request provided by the user
     */
    async acceptRequest(request: Request) {
        const requestUpdateCompletion = await RequestModel.updateOne({ requestId: request.requestId }, { requestAccepted: true }).exec();
        console.log(requestUpdateCompletion);
        const requestUpdated = await RequestModel.findOne({ requestId: request.requestId }) as unknown as Request;
        console.log(requestUpdated);
        return Promise.resolve(requestUpdated);
    }

    /**
     * Get automatic suggestion for reservation request
     */
    async autoSuggestionForRequest(request: Request): Promise<Reservation[]> {
        // The item ids which are available
        const itemIds: Item[] = await AvailabilityManager.instance.itemsAvailableInTimespan((request.startDate / 10000), (request.plannedEndDate / 10000));
        console.log(itemIds);
        return null as any;
    }

    /**
     * Gets all pending requests
     */
    async getAllRequests(): Promise<Request[]> {
        const requests = await RequestModel.find({ requestAccepted: false }) as unknown as Request[];
        return Promise.resolve(requests);
    }
}
