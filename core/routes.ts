const express = require('express');

const router = express.Router();

router.use((req, res, next) => {
    // TODO: CHECK AUTHENTICATION
    next();
});

// define the home page route
router.get('/', (req, res) => {
    res.send('<meta charset="utf-8"><h4>iPad Ausleihsystem Backend</h4><br>Entwickelt im Auftrag der Pädagogischen Hochschule Schwäbisch Gmünd<br><br>Version 0.1');
});

// serves statistics
router.get('/stats', (req, res) => {
    res.send({});
});

module.exports = router;
