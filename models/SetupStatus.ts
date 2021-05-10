/**
 * Determines if the system is set up or not
 */
export interface SetupStatus {
    setup: boolean, // True, if setup completed
    created: number, // timestamp system created
    step: number, // the setup step finished
}
