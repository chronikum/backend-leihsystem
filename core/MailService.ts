import ConfigurationClient from '../models/ConfigurationClient';
import { EmailConfiguration } from '../models/EmailConfiguration';
import { Request } from '../models/Request';
import { Reservation } from '../models/Reservation';
import { User } from '../models/User';
import UserManager from './database/UserManager';
import DBClient from './dbclient';

const nodemailer = require('nodemailer');

export default class MailService {
    /**
     * Transporter
     */
    transporter: any;

    /**
     * Configuration
     */
    configuration: EmailConfiguration;

    /**
     * dbclient
     */
    dbClient = DBClient.instance;

    /**
     * The configuration client
     */
    configurationClient = ConfigurationClient.instance;

    // Shared instance
    static instance = MailService.getInstance();

    public static getInstance(): MailService {
        if (!MailService.instance) {
            MailService.instance = new MailService();
        }

        return MailService.instance;
    }

    /**
     * Constructs an instance of MailService and initializes transporter
     */
    constructor() {
    }

    /**
     * Creates a nodemailer transport
     * - loads new variables
     */
    async createTransport(): Promise<any> {
        this.configuration = await this.configurationClient.getEmailConfiguration();
        this.dbClient.systemLog('Ein E-Mail-Transporter wird vorbereitet');
        if (this.configuration?.username) {
            try {
                this.transporter = nodemailer.createTransport({
                    host: this.configuration.host,
                    port: this.configuration.port,
                    secure: this.configuration.secure, // true for 465, false for other ports
                    auth: {
                        user: this.configuration?.username, // generated ethereal user
                        pass: this.configuration.password, // generated ethereal password
                    },
                });
                return Promise.resolve(this.transporter);
            } catch {
                return null;
            }
        }
        return null;
    }

    /**
     * This will send the user an email informing them that a reservation request got accepted
     *
     * @param User
     * @param Reservation
     */
    async sendTestMail(user: User) {
        await this.createTransport();
        if (this.configuration?.username) {
            try {
                const testMailStatus = await this.transporter.sendMail({
                    from: `"ZfM Leihsystem 👻" <${this.configuration?.username}>`, // sender address
                    to: `${user.username} <${user.email}>`, // list of receivers
                    subject: 'Konfigurierung funktioniert!', // Subject line
                    text: 'Diese E-Mail ist nur als HTML verfügbar.', // plain text body
                    html: 'Hallo Welt :) Das ist eine Test-Email!',
                });
            } catch {
                this.connectionFailed();
            }
        }
    }

    /**
     * Notify user about confirmation of their created request
     *
     * @param user: User
     * @param reservation Reservation to notify about
     */
    async sendConfirmationMail(user: User, reservation: Request) {
        await this.createTransport();
        if (this.configuration?.username) {
            try {
                const testMailStatus = await this.transporter.sendMail({
                    from: `"ZfM Leihsystem 👻" <${process.env.SMTP_USERNAME}>`, // sender address
                    to: `${user?.firstname} ${user?.surname} <${user?.email}>`, // list of receivers
                    subject: 'Reservierungsanfrage eingegangen', // Subject line
                    text: 'Diese E-Mail ist nur als HTML verfügbar.', // plain text body
                    html: `<h1>ZfM Reservierungsanfrage eingegangen!</h1><br>
                    Sehr geehrte/r ${user?.firstname} ${user?.surname},<br>
                    Ihre Reservierungsanfrage für den ${this.parseDate(reservation.startDate)} ist bei uns eingegangen.
                    Mehr Informationen erhalten Sie demnächst von eine/r Mitarbeiter/in des ZfM.<br>
                    Mit freundlichen Grüßen,<br>Ihr ZfM Ausleihsystem`,
                });
            } catch {
                this.connectionFailed();
            }
        }
    }

    /**
     * This will send the user an email informing them that a reservation request got accepted
     *
     * @param User
     * @param Reservation
     */
    async sendAcceptedMail(user: User, reservation: Request) {
        await this.createTransport();
        if (this.configuration?.username) {
            try {
                const testMailStatus = await this.transporter.sendMail({
                    from: `"ZfM Leihsystem 👻" <${process.env.SMTP_USERNAME}>`, // sender address
                    to: `${user?.firstname} ${user?.surname} <${user?.email}>`, // list of receivers
                    subject: 'Reservierungsanfrage bestätigt', // Subject line
                    text: 'Diese E-Mail ist nur als HTML verfügbar.', // plain text body
                    html: `<h1>ZfM Reservierungsanfrage bestätigt!</h1><br>
                    Sehr geehrte/r ${user?.firstname} ${user?.surname},<br>
                    Ihre Reservierungsanfrage für den ${this.parseDate(reservation.startDate)} wurde angenommen.
                    Mehr Informationen erhalten Sie demnächst von eine/r Mitarbeiter/in des ZfM.<br>
                    Mit freundlichen Grüßen,<br>Ihr ZfM Ausleihsystem`,
                });
            } catch {
                this.connectionFailed();
            }
        }
    }

    /**
     * This will send the user an email informing them that a reservation request got rejected
     *
     * @param User
     * @param Reservation
     */
    async sendRejectedMail(user: User, reservation: Request) {
        await this.createTransport();
        if (this.configuration?.username) {
            try {
                const testMailStatus = await this.transporter.sendMail({
                    from: `"ZfM Leihsystem 👻" <${process.env.SMTP_USERNAME}>`, // sender address
                    to: `${user?.firstname} ${user?.surname} <${user?.email}>`, // list of receivers
                    subject: 'Reservierungsanfrage abgelehnt', // Subject line
                    text: 'Diese E-Mail ist nur als HTML verfügbar.', // plain text body
                    html: `<h1>ZfM Reservierungsanfrage <b>abgelehnt</b>!</h1><br>
                    Sehr geehrte/r ${user?.firstname} ${user?.surname},<br>
                    Ihre Reservierungsanfrage für den ${this.parseDate(reservation.startDate)} wurde <b>nicht</b> bestätigt..
                    Mehr Informationen erhalten Sie demnächst von eine/r Mitarbeiter/in des ZfM.<br>
                    Mit freundlichen Grüßen,<br>Ihr ZfM Ausleihsystem`,
                });
            } catch {
                this.connectionFailed();
            }
        }
    }

    /**
     * This will send the user an email informing them that a reservation was finished successfully
     */
    sendReservationFinishedSuccessfullyMail() {

    }

    /**
   * Parses date
   */
    parseDate(number: number): string {
        if (number) {
            return `${new Date(number).toLocaleDateString()} um ${new Date(number).toLocaleTimeString()}`;
        }
        return '-';
    }

    /**
     * Will be called if the email connection fails
     */
    connectionFailed() {
        this.dbClient.systemLog('[ERROR] [MAIL] Eine E-Mail konnte nicht versendet werden. Sind die Zugangsdaten korrekt?');
    }
}
