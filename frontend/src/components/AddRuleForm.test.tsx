import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AddRuleForm } from './AddRuleForm';
import * as apiClientModule from '../api/apiClient';
import type { Device } from '../types';

vi.mock('../api/apiClient', () => ({
    apiClient: vi.fn(),
}));

type SnackbarFn = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => void;

vi.mock('../stores/appStore', () => ({
    useAppStore: <T,>(selector: (state: { showSnackbar: SnackbarFn }) => T) => selector({
        showSnackbar: vi.fn() as SnackbarFn,
    }),
}));

const mockDevices: Device[] = [
    { id: 'sensor-1', name: 'Temp Sensor', type: 'VIRTUAL', role: 'SENSOR', currentState: '{}', simulationActive: false, simulationConfig: null },
    { id: 'actuator-1', name: 'Light Switch', type: 'PHYSICAL', role: 'ACTUATOR', currentState: '{}', simulationActive: false, simulationConfig: null }
];

describe('AddRuleForm', () => {
    it('should validate form and submit data', async () => {
        const onRuleAdded = vi.fn();
        const mockApiClient = vi.spyOn(apiClientModule, 'apiClient').mockResolvedValue({});

        render(<AddRuleForm devices={mockDevices} onRuleAdded={onRuleAdded} />);

        const submitBtn = screen.getByRole('button', { name: /Create Rule/i });
        expect(submitBtn).toBeDisabled();

        fireEvent.change(screen.getByLabelText(/Rule Name/i), { target: { value: 'High Temp Alert' } });
        fireEvent.change(screen.getByLabelText(/Value/i), { target: { value: '30' } });

        const comboboxes = screen.getAllByRole('combobox');
        fireEvent.mouseDown(comboboxes[0]);
        fireEvent.click(await screen.findByRole('option', { name: 'Temp Sensor' }));

        fireEvent.mouseDown(comboboxes[2]);
        fireEvent.click(await screen.findByRole('option', { name: 'Light Switch' }));

        await waitFor(() => expect(submitBtn).toBeEnabled());
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockApiClient).toHaveBeenCalledWith('/api/rules', expect.objectContaining({
                method: 'POST',
                body: expect.objectContaining({
                    name: 'High Temp Alert',
                    triggerConfig: expect.objectContaining({ deviceId: 'sensor-1', value: '30' }),
                    actionConfig: expect.objectContaining({ deviceId: 'actuator-1' })
                })
            }));
        });
        expect(onRuleAdded).toHaveBeenCalled();
    });
});