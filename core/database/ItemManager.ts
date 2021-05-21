import { Item } from '../../models/Item';
import ItemModel from '../../models/mongodb-models/ItemModel';
import AvailabilityManager from './AvailabilityManager';

const crypto = require('crypto');

export default class ItemManager {
    /**
     * Item Logic
     */
    static instance = ItemManager.getInstance();

    public static getInstance(): ItemManager {
        if (!ItemManager.instance) {
            ItemManager.instance = new ItemManager();
        }

        return ItemManager.instance;
    }

    /**
     * Get inventory
     * @returns Item[] Items available
     */
    async getInventoryList(): Promise<Item[]> {
        const items = ((await ItemModel.find())) as unknown as Item[] || [];

        return Promise.resolve(items);
    }

    /**
     * Get item by id
     *
     * @param number id
     */
    async getItemById(id: number): Promise<Item> {
        const item = ((await ItemModel.findOne({ itemId: id }))) as unknown as Item;

        return item;
    }

    /**
     * Get items by ids
     *
     * @param number[] ids
     */
    async getItemsByIds(ids: number[]): Promise<Item[]> {
        const items = ((await ItemModel.find({ itemId: { $in: ids } }))) as unknown as Item[];
        if (items) {
            return Promise.resolve(items);
        }
        return [];
    }

    /**
     * Get item by unique generated string
     *
     * @param number generatedUniqueIdentifier
     */
    async getItemByUnique(unique: string): Promise<Item> {
        const item = ((await ItemModel.findOne({ generatedUniqueIdentifier: unique }))) as unknown as Item;
        const updatedAvailability = await this.updateAvailabilityOfItems([item]);
        return updatedAvailability[0];
    }

    /**
     * Create item with given values
     *
     * @param item
     *
     * @returns Created Item
     */
    async createItem(item: Item): Promise<Item> {
        const itemCount = await ItemModel.countDocuments({});
        const highestId: number = itemCount === 0 ? 0 : ((((await ItemModel.find()
            .sort({ itemId: -1 })
            .limit(1)) as unknown as Item[])[0].itemId || 0) as number);

        const initialAdminPassword = crypto.randomBytes(4).toString('hex');
        const generatedUniqueIdentifier = `${highestId}${initialAdminPassword}`;

        const itemtoCreate = new ItemModel({
            name: item.name || undefined,
            internalName: item.internalName || undefined,
            serialNumber: item.serialNumber || undefined,
            caIdentifier: item.caIdentifier || undefined,
            creationDate: item.creationDate || undefined,
            modificationDate: item.modificationDate || undefined,
            description: item.description || undefined,
            model: item.model || undefined,
            notes: item.notes || undefined,
            managed: item.managed || undefined,
            available: item.available || undefined,
            plannedReservationsIds: item.plannedReservationsIds || undefined,
            itemId: highestId + 1,
            generatedUniqueIdentifier,
            modelIdentifier: item.modelIdentifier || undefined,
        });

        await itemtoCreate.save({});

        return ItemModel.findOne({ itemId: (highestId + 1) }) as unknown as Item;
    }

    /**
     * Update an item with new properties
     *
     * @param item item which should be updated
     * @returns updatedItem
     */
    async updateItem(item: Item): Promise<Item> {
        const updatedItem = await ItemModel.updateOne({
            itemId: item.itemId,
        }, item, { upsert: false }) as any;

        return updatedItem;
    }

    /**
     * Delete items (if permission exists)
     *
     * @TODO Currently only admins can modify items data
     */
    async deleteItems(items: Item[]): Promise<boolean> {
        // All the item ids
        const itemIds = items.map((item) => item.itemId);
        const res = await ItemModel.deleteMany({
            itemId: {
                $in: itemIds || [],
            },
        });

        return Promise.resolve(!!res);
    }

    /**
     * Check availability of items
     *
     * @TODO MAYBE USE MONGOOSE RANGE SELECTOR INSTEAD!
     */
    async updateAvailabilityOfItems(items: Item[]): Promise<Item[]> {
        const itemsWithAvailability = await AvailabilityManager.instance.itemsAvailableinCollection(items);
        return itemsWithAvailability;
    }
}
