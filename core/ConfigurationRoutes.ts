import dayjs from 'dayjs';
import Jimp from 'jimp';
import { UserRoles } from '../enums/UserRoles';
import ConfigurationClient from '../models/ConfigurationClient';
import { EmailConfiguration } from '../models/EmailConfiguration';
import { Reservation } from '../models/Reservation';
import { User } from '../models/User';
import DatabaseManager from './databaseManager';
import DBClient from './dbclient';
import MailService from './MailService';
import RoleCheck from './RoleCheck';

const express = require('express');

const uploadPath = `${__dirname}/public/`;

/**
 * Database manager
 */
const dbManager = DatabaseManager.instance;

/**
 * Database manager
 */
const configurationClient = ConfigurationClient.instance;

/**
 * Mailing Service
 */
const mailingService = MailService.instance;
/**
 * The database client
 */
const dbClient = DBClient.instance;

/**
 * RoleCheck Client
 */
const roleCheck = RoleCheck.instance;

const configurationRouter = express.Router();

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
 * Upload logo
 */
configurationRouter.post('/uploadLogo', checkAuthentication, checkAdminPrivilege, async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(404).send('No files were uploaded.');
    }

    // Build the image path and image name.
    const image = req.files?.file;
    const fileSuffix = image?.name.split('.').reverse()[0] || '.jpeg';
    // Check the filesuffix.
    // Allowed are jpeg, jpg and png.
    const allowedFileFormats = ['jpeg', 'jpg', 'png'];
    if (!allowedFileFormats.includes(fileSuffix)) {
        return res.send({ success: false, message: 'The provided file format is not allowed' });
    }
    const uploadPathDestination = `${uploadPath}configuration/`;
    const uploadPathLogo = `${uploadPathDestination}logo_big.${fileSuffix}`;

    try {
        image.mv(uploadPathLogo, (err) => {
            if (!err) {
                // Write a logo.png file with smaller solution
                Jimp.read(uploadPathLogo, (err, img) => {
                    if (err) throw err;
                    img
                        .resize(256, Jimp.AUTO) // resize
                        .write(`${uploadPathDestination}logo.png`); // save
                    // write the favicon logo
                    image.mv(uploadPathLogo, (err) => {
                        if (!err) {
                            // Write a small version as favicon file
                            Jimp.read(uploadPathLogo, (err, img) => {
                                if (err) throw err;
                                img
                                    .resize(64, Jimp.AUTO) // resize
                                    .write(`${uploadPathDestination}favicon.ico`); // save
                                res.send({ success: true, message: 'File uploaded' });
                            });
                        }
                    });
                });
            }
        });
    } catch {
        console.log('Something went wrong');
    }
    console.log('File was uploaded to:');
    console.log(uploadPathLogo);
});

/**
 * Set E-Mail Configuration
 */
configurationRouter.post('/mailConfiguration', checkAuthentication, checkAdminPrivilege, async (req, res) => {
    const user: User = req.user as any;
    if (user.email) {
        const configuration: EmailConfiguration = req.body.configuration as any;
        // Check if all necessary fields are provided
        if (configuration?.host && configuration?.password && Number.isInteger(configuration?.port) && configuration?.username) {
            await configurationClient.setEmailConfiguration(configuration); // Write configuration
            mailingService.sendTestMail(user); // Send test mail
            res.send({ success: true });
            return;
        }
    }
    res.send({ success: false });
});

/**
 * Get system information
 */

/**
 * System logo
 */
configurationRouter.get('/logo', async (req, res) => {
    res.redirect(`${dbClient.endpoint}/static/configuration/logo.png`);
});

/**
 * Favicon logo
 */
configurationRouter.get('/favicon', async (req, res) => {
    res.redirect(`${dbClient.endpoint}/static/configuration/favicon.ico`);
});

module.exports = configurationRouter;
