import { UserRoles } from '../enums/UserRoles';
import DatabaseManager from './databaseManager';
import DBClient from './dbclient';
import RoleCheck from './RoleCheck';

const express = require('express');

/**
 * Database manager
 */
const dbManager = DatabaseManager.instance;

/**
 * The database client
 */
const dbClient = DBClient.instance;

/**
 * RoleCheck Client
 */
const roleCheck = RoleCheck.instance;

const chartRouter = express.Router();

/**
 * Checks authentication state
 */
function checkAuthentication(req: any, res: any, next: any) {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.send({ success: false, message: 'You are not allowed to see this resource.' });
    }
}

/**
 * Will check if user is explicit declared as admin user
 */
function checkAdminPrivilege(req: any, res: any, next: any) {
    if (req.isAuthenticated()) {
        const { user } = req;
        if (roleCheck.checkRole([UserRoles.ADMIN], user)) {
            next();
        }
    } else {
        res.send({ success: false, message: 'You are not allowed to see this resource.' });
    }
}

/**
 * Available
 */
chartRouter.post('/available', checkAuthentication, checkAdminPrivilege, async (req, res) => {
    const items = await dbClient.getInventoryList();
    const availableItems = await dbClient.updateAvailabilityOfItems(items || []);
    const itemsReservedCount = availableItems.filter((element) => element.available === false);
    const availableItemsStat = {
        available: availableItems.length,
        reserved: itemsReservedCount.length,
    };

    res.send({
        availableItemsStat,
    });
});

/**
 * Device models splittage charts
 */
chartRouter.post('/models', checkAuthentication, checkAdminPrivilege, async (req, res) => {
    const items = await dbClient.getInventoryList();
    const models = await dbClient.getAllDeviceModels();
    const modelAndAmount = [];

    models.forEach((model) => {
        const amount = items.filter((item) => item.modelIdentifier === model.deviceModelId) || [];
        modelAndAmount.push({
            modelName: model.displayName,
            deviceModelId: model.deviceModelId,
            amount: amount.length || 0,
        });
    });

    res.send({
        modelAndAmount,
    });
});

/**
 * Completed/Total reservation charts
 */
chartRouter.post('/completedReservation', checkAuthentication, checkAdminPrivilege, async (req, res) => {
    const reservations = await dbClient.getReservations();
    const completedReservations = reservations.filter((element) => element.completed === true);
    const reservationsStats = {
        total: (reservations.length - completedReservations.length),
        completed: completedReservations.length,
    };

    res.send({
        reservationsStats,
    });
});

/**
 * Shows how many users are in each group
 */
chartRouter.post('/userGroup', checkAuthentication, checkAdminPrivilege, async (req, res) => {
    const allGroups = await dbClient.getAllGroups();
    const allUsers = await dbClient.getAllUsers();
    const userAndGroups = [];

    allGroups.forEach((group) => {
        const amount = allUsers.filter((item) => item.groupId.includes(group.groupId)) || []; // Get every user which has the group id provided
        userAndGroups.push({
            displayName: group.displayName,
            groupId: group.groupId,
            amount: amount.length || 0,
        });
    });

    res.send({
        userAndGroups,
    });
});

module.exports = chartRouter;
