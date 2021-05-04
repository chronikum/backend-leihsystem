import mongoose, { Schema } from 'mongoose';

/**
 * LDAP config schema
 */
const ldapConfigurationSchema = new Schema({
    host: String,
    bindDN: String, // bind dn
    bindCredentials: String, // Password
    searchBase: String,
    searchFilter: String,
});

const LDAPConfigurationModel = mongoose.model('LdapConfiguration', ldapConfigurationSchema);

export default LDAPConfigurationModel;
