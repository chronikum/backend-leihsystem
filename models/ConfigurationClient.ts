import EmailConfigurationModel from './configuration-models/EmailConfigurationModel';
import { EmailConfiguration } from './EmailConfiguration';

/**
 * Describes ConfigurationClient
 */
export default class ConfigurationClient {
    // Shared instance
    static instance = ConfigurationClient.getInstance();

    public static getInstance(): ConfigurationClient {
        if (!ConfigurationClient.instance) {
            ConfigurationClient.instance = new ConfigurationClient();
        }

        return ConfigurationClient.instance;
    }

    /**
     * Set configurations
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
}
