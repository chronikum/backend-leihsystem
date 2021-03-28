import { User } from '../models/User';

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
     * The tokens associated with the emails
     */
    userTokens: {
        email: string, // The user e-mail
        token: string // The token which can be used to reset the password
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
     * Returns new instace of ResetPassword
     */
    constructor() { }

    /**
     * Checks token for email reset validation
     */
    checkToken(token: string, email: string): boolean {
        console.log(`Checking ${email}`);
        console.log(`Checking ${token}`);
        const available = this.userTokens.find((pair) => ((pair.email === email) && (pair.token === token)));
        console.log('Tokens available:');
        console.log(available);
        return !!available;
    }

    /**
     * Will send a test mail
     */
    testConfiguration() {
        this.sendMailToEmail('auzsgdfizagwigsdfiuaguizsf', {
            firstname: 'Jonathan',
            surname: 'Fritz',
            username: 'Jonathan2',
            email: 'fritz@nosc.io',
        } as any);
        this.addResetToken('auzsgdfizagwigsdfiuaguizsf', 'fritz@nosc.io');
    }

    /**
     * Add reset token to the non persistent array
     */
    addResetToken(token: string, email: string) {
        this.userTokens.push({
            token, email,
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
            from: `"Leihsystem 👻" <${process.env.SMTP_USERNAME}>`, // sender address
            to: `${user?.firstname} ${user?.surname} <${user?.email}>`, // list of receivers
            subject: 'Password-Reset', // Subject line
            text: 'Diese E-Mail ist nur als HTML verfügbar.', // plain text body
            html: `<meta charset="utf-8"><br><h2>ZfM Password Reset</h2><br>
            Sehr geehrte/r ${user?.firstname} ${user?.surname},<br> für Ihren Account wurde ein
            Passwort-Reset angefordert.\nWenn Sie dies angefordert haben, klicken Sie bitte auf
            diesen Link: https://irrturm.de/resetPassword/${user?.email}/${token}\n\nMit freundlichen Grüßen\nIhr Ausleihsystem`,
        });

        console.log('Message sent: %s', testMailStatus.messageId);
    }
}
