import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DeviceCommandModal } from './DeviceCommandModal';
import * as apiClientModule from '../api/apiClient';
import {type Device, DeviceRole, DeviceType} from '../types';

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
    type: DeviceType.VIRTUAL,
    role: DeviceRole.ACTUATOR,
    currentState: '{}',
    simulationActive: false,
    simulationConfig: null,
    online: true
};

describe('DeviceCommandModal', () => {
    it('should send Preset command correctly', async () => {
        const onClose = vi.fn();
        const mockApiClient = vi.spyOn(apiClientModule, 'apiClient').mockResolvedValue({});

        render(<DeviceCommandModal device={mockDevice} open={true} onClose={onClose} />);

        expect(screen.getByText(/Control Device: Smart Fan/i)).toBeInTheDocument();

        const sendBtn = screen.getByRole('button', { name: /Dispatch Command/i });
        fireEvent.click(sendBtn);

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

        const jsonBtn = screen.getByRole('button', { name: /JSON/i });
        fireEvent.click(jsonBtn);

        const input = screen.getByLabelText(/Command Payload/i);
        fireEvent.change(input, { target: { value: '{"speed": 100}' } });

        const sendBtn = screen.getByRole('button', { name: /Dispatch Command/i });
        fireEvent.click(sendBtn);

        await waitFor(() => {
            expect(mockApiClient).toHaveBeenCalledWith('/api/devices/actuator-1/command', expect.objectContaining({
                method: 'POST',
                body: { speed: 100 }
            }));
        });
    });
});