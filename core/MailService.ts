import { Request } from '../models/Request';
import { Reservation } from '../models/Reservation';
import { User } from '../models/User';

const nodemailer = require('nodemailer');

export default class MailService {
    /**
     * Transporter
     */
    transporter: any;

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
     * This will send the user an email informing them that a reservation request got accepted
     *
     * @param User
     * @param Reservation
     */
    async sendAcceptedMail(user: User, reservation: Request) {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USERNAME, // generated ethereal user
                pass: process.env.SMTP_PASSWORD, // generated ethereal password
            },
        });
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
        console.log(testMailStatus);
    }

    /**
     * This will send the user an email informing them that a reservation request got rejected
     *
     * @param User
     * @param Reservation
     */
    async sendRejectedMail(user: User, reservation: Request) {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USERNAME, // generated ethereal user
                pass: process.env.SMTP_PASSWORD, // generated ethereal password
            },
        });
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
        console.log(testMailStatus);
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
}
