/**
 * Represents the requested amount of specific devices
 */
export interface SubRequest {
    count: number, // This is the amount of devices requested
    deviceModelIdentifier: number, // This is the device model which references the DeviceModel
}
