import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './appStore';
import { act } from '@testing-library/react';
import type {Device, DeviceRole, DeviceType} from '../types';

vi.mock('../api/apiClient', () => ({
    apiClient: vi.fn(),
}));

describe('appStore', () => {
    // Reset
    beforeEach(() => {
        useAppStore.setState({
            devices: [],
            chartData: [],
            snackbar: { open: false, message: '', severity: 'info' }
        });
    });

    const mockDevice: Device = {
        id: 'dev-1',
        name: 'Test Device',
        type: 'VIRTUAL' as DeviceType,
        role: 'SENSOR' as DeviceRole,
        currentState: '{}',
        simulationActive: false,
        simulationConfig: null,
        online : true,
    };

    it('should add a device', () => {
        const { addOrUpdateDevice } = useAppStore.getState();

        act(() => {
            addOrUpdateDevice(mockDevice);
        });

        const { devices } = useAppStore.getState();
        expect(devices).toHaveLength(1);
        expect(devices[0]).toEqual(mockDevice);
    });

    it('should update an existing device', () => {
        const { addOrUpdateDevice } = useAppStore.getState();


        act(() => addOrUpdateDevice(mockDevice));

        const updatedDevice = { ...mockDevice, name: 'Updated Name' };
        act(() => addOrUpdateDevice(updatedDevice));

        const { devices } = useAppStore.getState();
        expect(devices).toHaveLength(1); // Still 1 device
        expect(devices[0].name).toBe('Updated Name');
    });

    it('should remove a device', () => {
        const { addOrUpdateDevice, removeDevice } = useAppStore.getState();

        act(() => addOrUpdateDevice(mockDevice));
        expect(useAppStore.getState().devices).toHaveLength(1);

        act(() => removeDevice('dev-1'));
        expect(useAppStore.getState().devices).toHaveLength(0);
    });

    it('should handle batch updates correctly', () => {
        const { updateDevicesBatch } = useAppStore.getState();

        const updates: Device[] = [
            { ...mockDevice, id: '1', name: 'D1' },
            { ...mockDevice, id: '2', name: 'D2' }
        ];

        act(() => {
            updateDevicesBatch(updates);
        });

        const { devices } = useAppStore.getState();
        expect(devices).toHaveLength(2);
        expect(devices.find(d => d.id === '1')).toBeDefined();
        expect(devices.find(d => d.id === '2')).toBeDefined();
    });

    it('should not mutate state if batch update contains no changes', () => {
        const { updateDevicesBatch, addOrUpdateDevice } = useAppStore.getState();

        act(() => addOrUpdateDevice(mockDevice));
        const initialState = useAppStore.getState();

        act(() => updateDevicesBatch([mockDevice]));

        const finalState = useAppStore.getState();

        expect(finalState.devices).toBe(initialState.devices);
    });
});