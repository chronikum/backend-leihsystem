import { UserRoles } from '../enums/UserRoles';
import DBClient from './dbclient';
import RoleCheck from './RoleCheck';
import SetupService from './SetupService';

const express = require('express');

/**
 * The database client
 */
const dbClient = DBClient.instance;

/**
 * RoleCheck Client
 */
const roleCheck = RoleCheck.instance;

/**
 * The setup service
 */
const setupService = SetupService.instance;

/**
 * The setup router
 */
const setupRouter = express.Router();

/**
 * Disable routes if setup status wasn't completed
 * - If setup routes could be accessed somwhow after a setup, consider this as a security issue.
 *   Shouldn't happen though as we test firmly for everything :)
 */
async function checkSetupStatus(req: any, res: any, next: any) {
    const setupStatus = await setupService.checkSetupStatus();
    if (!(setupStatus?.created)) {
        next();
    } else {
        res.send({ success: false, message: 'The system was already setup.' });
    }
}

/**
 * Returns the current setup status
 * - only available if the system is not fully setup
 */
setupRouter.post('/status', checkSetupStatus, async (req, res) => {
    const status = await setupService.checkSetupStatus();
    res.send({ success: true, setup: status || false });
});

/**
 * Creates admin user
 * - provide with user details
 * - the initial user
 */
setupRouter.post('/createAdmin', checkSetupStatus, async (req, res) => {
    const status = await setupService.checkSetupStatus();
    res.send({ success: true, setup: status || false });
});

module.exports = setupRouter;
