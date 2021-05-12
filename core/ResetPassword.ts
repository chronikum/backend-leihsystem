import crypto from 'crypto';
import ConfigurationClient from '../models/ConfigurationClient';
import { EmailConfiguration } from '../models/EmailConfiguration';
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
     * The configuration client
     */
    configurationClient = ConfigurationClient.instance;

    transporter: any;

    /**
     * Configuration
     */
    configuration: EmailConfiguration;

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
     * This function, called once, will periodically check for expired tokens and remove them.
     * - the function runs every 5 minutes
     * - tokens are valid for 20 minutes
     */
    clearExpiredTokens() {
        setInterval(() => {
            // Find all tokens to delete and flag them
            this.userTokens.forEach((token) => {
                const timeLeft = token.created - Date.now();
                if (timeLeft < -1200000) { // 20 minutes passed
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
     * - checks if the user is ldap
     */
    processResetRequest(user: User, resetChallenge: any) {
        if (!user.isLDAP && user?.email) {
            this.sendMailToEmail(resetChallenge.token, user);
            this.addResetToken(resetChallenge.token, user.email);
        } else {
            console.log('Cannot reset password of user with LDAP.');
        }
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
        const checkConfiguration = await this.createTransport();
        if (checkConfiguration) {
            // send mail with defined transport object
            const testMailStatus = await this.transporter.sendMail({
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
        } else {
            console.log('Unable to send E-Mail without configuration, sorry!');
            this.dbClient.systemLog('[INFO] E-Mail Versand nicht möglich: Keine E-Mail Konfiguration festgelegt.');
        }
    }
}
