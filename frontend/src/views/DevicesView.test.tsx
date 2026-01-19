import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import '@testing-library/jest-dom';
import { DevicesView } from './DevicesView';
import { DeviceType, DeviceRole } from '../types';
import type { Device } from '../types';
import type * as MuiMaterial from '@mui/material';

vi.mock('../api/apiClient', () => ({
    apiClient: vi.fn(),
}));

const mockResizeObserver = vi.fn();
mockResizeObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
});
global.ResizeObserver = mockResizeObserver;

vi.mock('@mui/material', async (importOriginal) => {
    // Correctly typed dynamic import
    const actual = await importOriginal<typeof MuiMaterial>();
    return {
        ...actual,
        Grow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        Fade: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    };
});

const mockFetchDevices = vi.fn();
const mockRemoveDevice = vi.fn();
const mockShowSnackbar = vi.fn();
const mockSetLiveUpdateCallback = vi.fn();

const mockDevices: Device[] = [
    {
        id: '1',
        name: 'Sensor A',
        type: DeviceType.PHYSICAL,
        role: DeviceRole.SENSOR,
        currentState: '{"temp": 20}',
        simulationActive: false,
        simulationConfig: null,
        online: true
    },
    {
        id: '2',
        name: 'Actuator B',
        type: DeviceType.VIRTUAL,
        role: DeviceRole.ACTUATOR,
        currentState: '{"status": "ON"}',
        simulationActive: true,
        simulationConfig: null,
        online: false
    },
];

const mockStoreState = {
    devices: mockDevices,
    fetchDevices: mockFetchDevices,
    removeDevice: mockRemoveDevice,
    showSnackbar: mockShowSnackbar,
    liveUpdateCallback: null,
    setLiveUpdateCallback: mockSetLiveUpdateCallback,
};

vi.mock('../stores/appStore', () => ({
    useAppStore: <T,>(selector: (state: typeof mockStoreState) => T) => {
        return selector(mockStoreState);
    },
}));

describe('DevicesView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterAll(() => {
        vi.restoreAllMocks();
    });

    it('should fetch devices on mount', async () => {
        render(<DevicesView />);
        await waitFor(() => {
            expect(mockFetchDevices).toHaveBeenCalled();
        });
    });

    it('should render actual DeviceCards with correct content', async () => {
        render(<DevicesView />);

        // Wait for cards
        await waitFor(() => {
            expect(screen.getByText('Sensor A')).toBeInTheDocument();
            expect(screen.getByText('Actuator B')).toBeInTheDocument();
        });

        // Verify content
        expect(screen.getByText('ID: 1')).toBeInTheDocument();
        expect(screen.getByText(/"temp": 20/)).toBeInTheDocument();

        // check chips
        expect(screen.getByTitle(DeviceType.PHYSICAL)).toBeInTheDocument();
        expect(screen.getByTitle(DeviceType.VIRTUAL)).toBeInTheDocument();
    });
});