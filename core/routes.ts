// eslint-disable-next-line import/extensions
import passport from 'passport';
import DatabaseManager from './databaseManager';

const express = require('express');
// The database manager
const dbManager = DatabaseManager.instance;

const router = express.Router();

/**
 * Checks if database is connected
 */
router.use((req, res, next) => {
    if (dbManager.ready) {
        next();
    } else {
        const response = `Could not connect to mongodb database. Please check if it is running. <br> <b>Error Message from DatabaseManager<b>:<br> <p style="color:red">${DatabaseManager.instance?.errorMessage || 'none'}</p>`;
        res.send(response);
    }
});

// Backend home page
router.get('/', (req, res) => {
    res.send('<meta charset="utf-8"><h4>iPad Ausleihsystem Backend</h4><br>Entwickelt im Auftrag der Pädagogischen Hochschule Schwäbisch Gmünd<br><br>Version 0.1');
});

// serves statistics
router.get('/stats', (req, res) => {
    res.send({});
});

// User Login
router.post('/login', passport.authenticate("local"), (req, res) => {
    res.send({ success: true });
});

/**
 * Checks authentication state
 */
function checkAuthentication(req: any, res: any, next: any) {
    if (req.isAuthenticated()) {
        console.log("Authenticated!");
        next();
    } else {
        console.log("Authentication failed.");
        res.redirect("login");
    }
}

module.exports = router;
