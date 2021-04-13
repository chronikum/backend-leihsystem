import crypto from 'crypto';
import { User } from '../models/User';
import DBClient from './dbclient';

const nodemailer = require('nodemailer');
/**
 *
 * TODO: Tokes should be invalidated after a certain time
 *
 * Will send an e-mail with a link to reset the password of the user associated with
 * the e-mail
 *
 * The resets token are saved in a variable which is not persistent
 * and is only available during runtime.
 *
 */
export default class ResetPassword {
    /**
     * DB Client instance
     */
    dbClient = DBClient.getInstance();

    /**
     * The tokens associated with the emails
     */
    userTokens: {
        email: string, // The user e-mail
        token: string // The token which can be used to reset the password
        created: number
    }[] = [];

    // Shared instance
    static instance = ResetPassword.getInstance();

    public static getInstance(): ResetPassword {
        if (!ResetPassword.instance) {
            ResetPassword.instance = new ResetPassword();
        }
        return ResetPassword.instance;
    }

    /**
     * Create a new password reset challenge
     *
     * - also checks if e-mail is in system
     * - processes it afterwards
     */
    async createNewPasswordResetChallenge(email: string) {
        const generatedToken = crypto.randomBytes(12).toString('hex');
        const resetChallenge = {
            email,
            token: generatedToken,
        };
        const user = await this.dbClient.getUserForEmail(email);
        if (user) {
            this.processResetRequest(user, resetChallenge);
        }
    }

    /**
     * Returns new instace of ResetPassword
     */
    constructor() {
        this.clearExpiredTokens();
    }

    /**
     * This function, called once, will periodically check for expired tokens and remove them.
     * - the function runs every 5 minutes
     * - tokens are valid for 20 minutes
     */
    clearExpiredTokens() {
        setInterval(() => {
            // Find all tokens to delete and flag them
            this.userTokens.forEach((token) => {
                const timeLeft = token.created - Date.now();
                if (timeLeft < -1200000) { // 10 minutes passed
                    token.created = 0;
                }
            });
            // Remove all tokens which were flagged for deletion
            this.userTokens = this.userTokens.filter((token) => token.created !== 0);
        }, 300000);
    }

    /**
     * Checks token for email reset validation
     */
    checkToken(token: string, email: string): boolean {
        const available = this.userTokens.find((pair) => ((pair.email === email) && (pair.token === token)));

        return !!available;
    }

    /**
     * Process the reset request
     *
     * - sends mail
     * - adds the reset token to the list
     */
    processResetRequest(user: User, resetChallenge: any) {
        this.sendMailToEmail(resetChallenge.token, user);
        this.addResetToken(resetChallenge.token, user.email);
    }

    /**
     * Add reset token to the non persistent array
     */
    addResetToken(token: string, email: string) {
        const created = Date.now();
        this.userTokens.push({
            token, email, created,
        });
    }

    /**
     * Sends a reset password email
     *
     * @param token for the
     * @param email provided
     */
    async sendMailToEmail(token: string, user: User) {
        // process.env.SMTP_USERNAME
        // process.env.SMTP_PASSWORD
        // process.env.SMTP_HOST

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USERNAME, // generated ethereal user
                pass: process.env.SMTP_PASSWORD, // generated ethereal password
            },
        });

        // send mail with defined transport object
        const testMailStatus = await transporter.sendMail({
            from: `"ZfM Leihsystem 👻" <${process.env.SMTP_USERNAME}>`, // sender address
            to: `${user?.firstname} ${user?.surname} <${user?.email}>`, // list of receivers
            subject: 'Password-Reset', // Subject line
            text: 'Diese E-Mail ist nur als HTML verfügbar.', // plain text body
            html: `<h1>ZfM Password Reset</h1><br>
            Sehr geehrte/r ${user?.firstname} ${user?.surname},<br> für Ihren Account wurde ein
            Passwort-Reset angefordert.<br>Wenn Sie dies angefordert haben, klicken Sie bitte auf
            diesen Link: <br>https://irrturm.de/resetPassword/${user?.email}/${token} <br>
            Der Reset-Link ist für 20 Minuten gültig.<br><br><br>Wenn Sie keinen Password-Request
            angefordert haben, bitten wir Sie, diese E-Mail zu ignorieren.<br><br>
            Mit freundlichen Grüßen<br>Ihr Ausleihsystem`,
        });

        console.log('Message sent: %s', testMailStatus.messageId);
    }
}
