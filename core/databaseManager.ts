import mongoose from 'mongoose';
import { Observable } from 'rxjs';

/**
 * Establishes connection to the database and handles errors
 */
export default class DatabaseManager {
    // Shared Instance
    static instance = DatabaseManager.getInstance();

    public static getInstance(): DatabaseManager {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }

        return DatabaseManager.instance;
    }

    // The path to the database
    private path = 'mongodb://localhost:27017/database';

    // The connection instance
    private db = mongoose.connection;

    // Flag to determine if db is ready
    ready: boolean = false;

    // Flag to determine if db is ready
    error: boolean = false;

    // Error Message
    errorMessage?: string;

    // Connection to the database
    connection?: mongoose.Connection;

    // Event to notify server when ready
    statusObservable = new Observable((subscriber) => {
        // Try to connect and catch when fail

        mongoose.connect(this.path, { useNewUrlParser: true }).catch(
            // eslint-disable-next-line no-return-assign
            (error) => DatabaseManager.instance.errorMessage = error,
        );

        this.db.once('open', () => {
            this.ready = true;
            this.connection = this.db;
            subscriber.next(true);
        });

        this.db.on('error', () => {
            this.ready = false;
            this.error = true;
            subscriber.next(false);
        });

        this.db.on('disconnected', (x) => {
            this.ready = false;
            this.error = true;
            subscriber.next(false);
        });

        this.db.on('connected', (x) => {
            this.ready = true;
            this.connection = this.db;
            subscriber.next(true);
        });
    });
}
