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

    /**
     * Determines if LDAp is available
     */
    ldapAvailable: boolean = false;

    public static getInstance(): ConfigurationClient {
        if (!ConfigurationClient.instance) {
            ConfigurationClient.instance = new ConfigurationClient();
        }

        return ConfigurationClient.instance;
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
            this.ldapAvailable = true;
            return Promise.resolve(configuration);
        }
        this.ldapAvailable = false;
        return null;
    }
}
