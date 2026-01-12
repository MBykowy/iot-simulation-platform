import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DeviceCommandModal } from './DeviceCommandModal';
import * as apiClientModule from '../api/apiClient';
import type { Device } from '../types';

// Mock Dependencies
vi.mock('../api/apiClient', () => ({
    apiClient: vi.fn(),
}));

vi.mock('../stores/appStore', () => ({
    useAppStore: <T,>(selector: (state: { showSnackbar: unknown }) => T) => selector({
        showSnackbar: vi.fn(),
    }),
}));

const mockDevice: Device = {
    id: 'actuator-1',
    name: 'Smart Fan',
    type: 'VIRTUAL',
    role: 'ACTUATOR',
    currentState: '{}',
    simulationActive: false,
    simulationConfig: null
};

describe('DeviceCommandModal', () => {
    it('should send Preset command correctly', async () => {
        const onClose = vi.fn();
        const mockApiClient = vi.spyOn(apiClientModule, 'apiClient').mockResolvedValue({});

        render(<DeviceCommandModal device={mockDevice} open={true} onClose={onClose} />);

        // 1. Verify Title
        expect(screen.getByText(/Send Command: Smart Fan/i)).toBeInTheDocument();

        // 2. Select Action (Default is ON)
        // Click Send
        const sendBtn = screen.getByRole('button', { name: /Send Command/i });
        fireEvent.click(sendBtn);

        // 3. Verify API Call
        await waitFor(() => {
            expect(mockApiClient).toHaveBeenCalledWith('/api/devices/actuator-1/command', expect.objectContaining({
                method: 'POST',
                body: { status: 'ON' }
            }));
        });

        expect(onClose).toHaveBeenCalled();
    });

    it('should send Custom JSON command correctly', async () => {
        const onClose = vi.fn();
        const mockApiClient = vi.spyOn(apiClientModule, 'apiClient').mockResolvedValue({});

        render(<DeviceCommandModal device={mockDevice} open={true} onClose={onClose} />);

        // 1. Switch to JSON Mode
        const jsonBtn = screen.getByRole('button', { name: /Advanced \(JSON\)/i });
        fireEvent.click(jsonBtn);

        // 2. Input JSON
        const input = screen.getByLabelText(/JSON Payload/i);
        fireEvent.change(input, { target: { value: '{"speed": 100}' } });

        // 3. Click Send
        const sendBtn = screen.getByRole('button', { name: /Send Command/i });
        fireEvent.click(sendBtn);

        // 4. Verify API Call
        await waitFor(() => {
            expect(mockApiClient).toHaveBeenCalledWith('/api/devices/actuator-1/command', expect.objectContaining({
                method: 'POST',
                body: { speed: 100 }
            }));
        });
    });
});