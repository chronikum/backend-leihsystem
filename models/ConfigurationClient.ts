/* eslint-disable no-underscore-dangle */
import EmailConfigurationModel from './configuration-models/EmailConfigurationModel';
import LDAPConfigurationModel from './configuration-models/LDAPConfigurationModel';
import { EmailConfiguration } from './EmailConfiguration';
import { LDAPConfiguration } from './LDAPConfiguration';

/**
 * Describes ConfigurationClient
 */
export default class ConfigurationClient {
    // Shared instance
    static instance = ConfigurationClient.getInstance();

    private _ldapAvailable: boolean;

    /**
     * Determines if LDAp is available
     */
    public get ldapAvailable() {
        return this._ldapAvailable;
    }

    public set ldapAvailable(state: boolean) {
        this._ldapAvailable = state;
    }

    public static getInstance(): ConfigurationClient {
        if (!ConfigurationClient.instance) {
            ConfigurationClient.instance = new ConfigurationClient();
        }

        return ConfigurationClient.instance;
    }

    constructor() {
        console.log('Configuration Service is being started.');
        this.getLDAPConfiguration();
    }
    /**
     * Set configurations
     * @TODO add callback to inform the parent if the operations were successful
     */

    /**
     * Set the Email Configuration
     * - deletes the old one
     * - saves the new one
     */
    async setEmailConfiguration(configuration: EmailConfiguration) {
        const newConfiguration = new EmailConfigurationModel(configuration);
        await EmailConfigurationModel.deleteMany({});
        await newConfiguration.save();
    }

    /**
     * Set the new ldap configuration
     * - deletes the old one
     * - saves the new one
     * @param configuration
     */
    async setLdapConfiguration(configuration: LDAPConfiguration) {
        const newConfiguration = new LDAPConfigurationModel(configuration);
        await LDAPConfigurationModel.deleteMany({});
        await newConfiguration.save();
        this.ldapAvailable = true;
    }

    /**
     * Get information
     */

    /**
     * Gets the E-Mail Configuration if present
     */
    async getEmailConfiguration(): Promise<EmailConfiguration> {
        const configuration = await EmailConfigurationModel.findOne({}) as unknown as EmailConfiguration;
        if (configuration) {
            return Promise.resolve(configuration);
        }
        return null;
    }

    /**
     * Gets the LDAP Configuration if present
     */
    async getLDAPConfiguration(): Promise<LDAPConfiguration> {
        const configuration = await LDAPConfigurationModel.findOne({}) as unknown as LDAPConfiguration;
        if (configuration) {
            console.log('FOUND LDAP CONFIGURATION!');
            this.ldapAvailable = true;
            return Promise.resolve(configuration);
        }
        console.log('There is no ldap configuration available!');
        this.ldapAvailable = false;
        return null;
    }
}
