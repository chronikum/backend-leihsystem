/**
 * Represents a device model
 */
export interface DeviceModel {
    displayName: string,
    deviceModelId: number,
    description: string,
    capabilities?: string,
    defaultDeviceValue?: number, // as higher the number is as more the system will default to lend this device automatic.
}
