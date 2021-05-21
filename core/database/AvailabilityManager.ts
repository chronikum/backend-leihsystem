import dayjs from 'dayjs';
import { Item } from '../../models/Item';
import ItemModel from '../../models/mongodb-models/ItemModel';
import ReservationModel from '../../models/mongodb-models/ReservationModel';
import { Reservation } from '../../models/Reservation';
import { User } from '../../models/User';
import ItemManager from './ItemManager';
import ReservationManager from './ReservationManager';

export default class AvailabilityManager {
    /**
     * Instance logic
     */
    static instance = AvailabilityManager.getInstance();

    public static getInstance(): AvailabilityManager {
        if (!AvailabilityManager.instance) {
            AvailabilityManager.instance = new AvailabilityManager();
        }

        return AvailabilityManager.instance;
    }

    /**
     * Reserve items with a reservation
     */
    async reserveItemsWithReservation(reservation: Reservation, items: Item[], user: User): Promise<any> {
        const canBeApplied = await this.canReservationBeApplied(reservation, items, user);
        if (canBeApplied) {
            const reservationCount = await ReservationModel.countDocuments({});
            const reservationId = reservationCount + 1;

            reservation.reservationId = reservationId;

            // Create reservation with user ID
            const reservationtoCreate = new ReservationModel({
                reservationName: reservation.reservationName,
                reservationId,
                description: reservation.description,
                approvalRequired: reservation.approvalRequired,
                approved: reservation.approved || undefined,
                responsible: user.userId,
                itemIds: reservation.itemIds,
                startDate: reservation.startDate,
                plannedEndDate: reservation.plannedEndDate,
                completed: false,
            });

            console.log(`Created reservation id: ${reservationId}`);
            ReservationManager.instance.applyReservationToItems(items, reservation);

            await reservationtoCreate.save();
            return Promise.resolve({ sucess: true, message: 'Reservation created' });
        }
        return Promise.resolve(null);
    }

    /**
     * Check if a reservation is appliable
     * - Checks if the items which the users want and the which the can access are the same
     * - Checks if the reservation collides with another reservation which has been applied
     */
    async canReservationBeApplied(reservation: Reservation, items: Item[], user: User): Promise<boolean> {
        const itemIds = items.map((item) => item.itemId);

        // Load items from database
        const results = await ItemModel.find().where('itemId').in(itemIds) as unknown as Item[];

        const affectedReservationIds: Set<number> = new Set<number>();

        // All affected reservation ids
        results.forEach((item) => item.plannedReservationsIds.forEach((id) => affectedReservationIds.add(id)));
        // Load the affected reservations
        const affectedReservations = await ReservationModel.find().where('reservationId').in(Array.from(affectedReservationIds)) as unknown as Reservation[];
        // Check if reservation collides with any collisions
        const validReservationRequest = this.reservationHasNoCollisions(affectedReservations, reservation);

        return Promise.resolve(
            ((results.length) && validReservationRequest),
        );
    }

    /**
     * Checks if a item should be available right now (a reservation is currently active within the selected item ids)
     *
     * Also sets the current reservationId if necessary
     *
     *
     */
    async itemsAvailableinCollection(items: Item[]): Promise<Item[]> {
        const itemIds = items.map((item) => item.itemId);
        const existingItems = await ItemModel.find().where('itemId').in(itemIds) as unknown as Item[];

        // Get all reservations
        const allReservations = await this.reservationsInItemCollection(existingItems);
        const allReservationIds = allReservations.map((reservation: Reservation) => reservation.reservationId);

        const newReservationStartDate = dayjs.unix(Date.now());
        const newReservationEndDate = dayjs.unix(Date.now());

        const reservationsAvailable = await ReservationModel.find({
            $or: [
                { // BEFORE RESERVATION
                    $and: [
                        { plannedEndDate: { $lt: newReservationEndDate } },
                        { startDate: { $lt: newReservationStartDate } },
                        { reservationId: { $in: allReservationIds } },
                    ],
                },
                { // AFTER RESERVATION
                    $and: [
                        { plannedEndDate: { $gt: newReservationEndDate } },
                        { startDate: { $gt: newReservationStartDate } },
                        { reservationId: { $in: allReservationIds } },
                    ],
                },
            ],
        });
        // An array with all currently inactive reservations
        const inactiveReservation = [];

        // Returns an array with all valid reservations
        const updatedReservations = allReservations.map((reservation) => {
            if (reservation.startDate && reservation.plannedEndDate) {
                const startDatePlanned = dayjs.unix(reservation.startDate);
                const endDatePlanned = dayjs.unix(reservation.plannedEndDate);

                // The reservation has started but was not completed yet - it is delayed.
                // The devices are not available!
                if ((startDatePlanned.isBefore(newReservationStartDate) && (!reservation.completed))) {
                    reservation.active = true;
                    return reservation;
                }

                // Dates are both before the time span or after
                // eslint-disable-next-line max-len
                if ((newReservationStartDate.isBefore(startDatePlanned) && newReservationEndDate.isBefore(startDatePlanned)) || ((newReservationStartDate.isAfter(endDatePlanned) && newReservationEndDate.isAfter(endDatePlanned)))) {
                    reservation.active = false;
                    inactiveReservation.push(reservation);
                    return reservation;
                }

                reservation.active = true;
                return reservation;
            }
            return reservation;
        });

        const activeReservations = inactiveReservation.map((reservation) => reservation.reservationId);

        // eslint-disable-next-line no-return-assign
        existingItems.forEach((item) => item.available = ((item.plannedReservationsIds || []).every((id) => activeReservations.includes(id))));
        const itemsAvailable = existingItems.filter((item) => item.available);

        const totalActiveReservations = updatedReservations.filter((reservation: Reservation) => reservation.active);

        return existingItems;
    }

    /**
     * Returns items which are available during the given timespan
     */
    async itemsAvailableinCollectionDuringTimespan(items: Item[], startDate: number, endDate: number): Promise<Item[]> {
        const newReservationStartDate = dayjs.unix(startDate);
        const newReservationEndDate = dayjs.unix(endDate);
        const itemIds = items.map((item) => item.itemId);
        const existingItems = await ItemModel.find().where('itemId').in(itemIds) as unknown as Item[];
        const allReservations = ReservationModel.find({}) as unknown as Reservation[];

        // Reservations which are not colliding with our own reservation
        const reservationsAvailable = await ReservationModel.find({
            $or: [
                { // BEFORE RESERVATION
                    $and: [
                        {
                            plannedEndDate: { $lt: newReservationStartDate },
                        },
                    ],
                },
                { // AFTER RESERVATION
                    $and: [
                        { startDate: { $gt: newReservationEndDate } },
                    ],
                },
            ],
        });
        // An array with all currently inactive reservations
        const inactiveReservation = [];

        // Returns an array with all valid reservations
        const updatedReservations = allReservations.map((reservation) => {
            if (reservation.startDate && reservation.plannedEndDate) {
                const startDatePlanned = dayjs.unix(reservation.startDate);
                const endDatePlanned = dayjs.unix(reservation.plannedEndDate);

                // Dates are both before the time span or after
                // eslint-disable-next-line max-len
                if ((newReservationStartDate.isBefore(startDatePlanned) && newReservationEndDate.isBefore(startDatePlanned)) || ((newReservationStartDate.isAfter(endDatePlanned) && newReservationEndDate.isAfter(endDatePlanned)))) {
                    reservation.active = false;
                    inactiveReservation.push(reservation);
                    return reservation;
                }
                reservation.active = true;
                return reservation;
            }
            return reservation;
        });

        const activeReservations = inactiveReservation.map((reservation) => reservation.reservationId);

        // eslint-disable-next-line no-return-assign
        existingItems.forEach((item) => item.available = ((item.plannedReservationsIds || []).every((id) => activeReservations.includes(id))));
        console.log(existingItems);
        const itemsAvailable = existingItems.filter((item) => item.available);

        const totalActiveReservations = updatedReservations.filter((reservation: Reservation) => reservation.active);
        console.log(totalActiveReservations.length);
        console.log(reservationsAvailable.length);

        return existingItems;
    }

    /**
     * Returns all items which are available in the given time frame
     *
     * - gets all reservations overlapping with the new one
     * - gets the items in those reservations
     * - checks which items won't be available
     */
    async itemsAvailableInTimespan(startDate: number, endDate: number): Promise<Item[]> {
        const allItems = await ItemModel.find() as unknown as Item[];
        const itemIds = allItems.map((item) => item.itemId);
        const allReservations = await ReservationModel.find({}) as unknown as Reservation[];

        // 1616421600000
        // 161642226
        const reservationsActiveDuringRequestedTime = await ReservationModel.find({
            $nor: [
                { // BEFORE RESERVATION
                    $and: [
                        { plannedEndDate: { $lt: startDate } },
                        { startDate: { $lt: startDate } },
                    ],
                },
                { // AFTER RESERVATION
                    $and: [
                        { plannedEndDate: { $gt: endDate } },
                        { startDate: { $gt: endDate } },
                    ],
                },
            ],
        }) as unknown as Reservation[];
        console.log('Reservations FOUND during requested time:');
        console.log(reservationsActiveDuringRequestedTime);
        const itemsReserved: string[] = [];
        reservationsActiveDuringRequestedTime.forEach((reservation: Reservation) => {
            reservation.itemIds.forEach((itemId) => {
                itemsReserved.push(itemId.toString());
            });
        });
        const availableItems = allItems.filter((item) => !itemsReserved.includes(item.itemId.toString()));
        availableItems.map(async (item) => {
            const loadedItem = await ItemManager.instance.getItemById(item.itemId);
            return loadedItem;
        });
        return Promise.resolve(availableItems);
    }

    /**
     * Checks if any reservations collisions occure
     * @param reservationIds
     * @param newReservation
     *
     * @returns true if no collision exists
     */
    reservationHasNoCollisions(currentReservations: Reservation[], newReservation: Reservation): boolean {
        const validDates = currentReservations.filter((reservation) => {
            if (newReservation.startDate && newReservation.plannedEndDate) {
                const startDatePlanned = dayjs.unix(reservation.startDate);
                const endDatePlanned = dayjs.unix(reservation.plannedEndDate);
                const newReservationStartDate = dayjs.unix(newReservation.startDate);
                const newReservationEndDate = dayjs.unix(newReservation.plannedEndDate);

                // Dates are both before the time span or after
                // eslint-disable-next-line max-len
                if ((newReservationStartDate.isBefore(startDatePlanned) && newReservationEndDate.isBefore(startDatePlanned)) || ((newReservationStartDate.isAfter(endDatePlanned) && newReservationEndDate.isAfter(endDatePlanned)))) {
                    return true;
                }
                return false;
            }
            return false;
        });
        const valid = (validDates.length === currentReservations.length);
        console.log(`Is valid: ${valid}`);
        return valid;
    }

    /**
     * Returns all the reservations an item holds
     *
     * @param items
     *
     * @returns Reservations
     */
    async reservationsInItemCollection(items: Item[]): Promise<Reservation[]> {
        const affectedReservationIds: Set<number> = new Set<number>();

        const itemIds = items.map((item) => item.itemId);
        const results = await ItemModel.find().where('itemId').in(itemIds) as unknown as Item[];
        results.forEach((item) => item.plannedReservationsIds.forEach((id) => affectedReservationIds.add(id)));
        return ReservationModel.find().where('reservationId').in(Array.from(affectedReservationIds)) as unknown as Reservation[];
    }
}
