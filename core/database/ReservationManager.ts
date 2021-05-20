import { Item } from '../../models/Item';
import ItemModel from '../../models/mongodb-models/ItemModel';
import ReservationModel from '../../models/mongodb-models/ReservationModel';
import { Reservation } from '../../models/Reservation';

export default class ReservationManager {
    /**
     * Instance logic
     */
    static instance = ReservationManager.getInstance();

    public static getInstance(): ReservationManager {
        if (!ReservationManager.instance) {
            ReservationManager.instance = new ReservationManager();
        }

        return ReservationManager.instance;
    }

    /**
     * Finish Reservation
     *
     * @param request provided by user
     * @returns updated Request
     */
    async finishReservation(reservation: Reservation): Promise<Reservation> {
        const dateNow = Date.now();
        await ReservationModel.updateOne({ reservationId: reservation.reservationId }, { completed: true, plannedEndDate: dateNow }).exec();
        const reservationUpdated = await ReservationModel.findOne({ reservationId: reservation.reservationId }) as unknown as Reservation;
        return Promise.resolve(reservationUpdated);
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

    /**
     * Update the items with the applied reservation
     * - Updates the items in the database
     */
    applyReservationToItems(items: Item[], reservation: Reservation) {
        const itemIds = items.map((item) => item.itemId);
        ItemModel.updateMany(
            { itemId: { $in: itemIds } },
            { $push: { plannedReservationsIds: reservation.reservationId } },
            { multi: true },
        ).exec();
    }

    /**
     * Returns all the reservations available and relevant
     *
     * @param items
     *
     * @returns Reservations
     */
    async getReservations(): Promise<Reservation[]> {
        const allReservations: Reservation[] = await ReservationModel.find({}) as unknown as Reservation[];

        return allReservations;
    }

    /**
     * get details about an existing reservation
     * @param reservationId id of the reservation
     */
    async getReservationById(reservationId: number): Promise<Reservation> {
        return ReservationModel.find({ reservationId }) as unknown as Promise<Reservation>;
    }
}
