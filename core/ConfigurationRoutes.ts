import dayjs from 'dayjs';
import Jimp from 'jimp';
import { UserRoles } from '../enums/UserRoles';
import { Reservation } from '../models/Reservation';
import DatabaseManager from './databaseManager';
import DBClient from './dbclient';
import RoleCheck from './RoleCheck';

const express = require('express');

const uploadPath = `${__dirname}/public/`;

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
    const image = req.files.file;
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
        // Write a smaller version of the file
        // eslint-disable-next-line consistent-return
        image.mv(uploadPathLogo, (err) => {
            if (!err) {
                // Write a small version of the file next to the image file
                Jimp.read(uploadPathLogo, (err, img) => {
                    if (err) throw err;
                    img
                        .resize(256, Jimp.AUTO) // resize
                        .quality(80) // set JPEG quality
                        .write(`${uploadPathDestination}original.jpeg`); // save
                    // Write a bigger version, but with a specific file ending
                    image.mv(uploadPathLogo, (err) => {
                        if (!err) {
                            // Write a small version of the file next to the image file
                            Jimp.read(uploadPathLogo, (err, img) => {
                                if (err) throw err;
                                img
                                    .write(`${uploadPathDestination}logo.png`); // save
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
 * Get system information
 */

/**
 * System logo
 */
configurationRouter.get('/logo', async (req, res) => {
    res.redirect(`${dbClient.endpoint}/static/configuration/logo.png`);
});

module.exports = configurationRouter;
