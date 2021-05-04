/**
 * LDAP Configuration to be used
 */
export interface LDAPConfiguration {
    host: string,
    bindDN: string, // bind dn
    bindCredentials: string, // Password
    searchBase: string,
    searchFilter: string,
}
