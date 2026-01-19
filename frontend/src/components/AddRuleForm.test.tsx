import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AddRuleForm } from './AddRuleForm';
import * as apiClientModule from '../api/apiClient';
import type { Device, DeviceRole, DeviceType } from '../types';

vi.mock('../api/apiClient', () => ({
    apiClient: vi.fn(),
}));

vi.mock('../stores/appStore', () => ({
    useAppStore: <T,>(selector: (state: { showSnackbar: unknown }) => T) => selector({
        showSnackbar: vi.fn(),
    }),
}));

const mockDevices: Device[] = [
    {
        id: 'sensor-1',
        name: 'Temp Sensor',
        type: 'VIRTUAL' as DeviceType,
        role: 'SENSOR' as DeviceRole,
        currentState: '{}',
        simulationActive: false,
        simulationConfig: null,
        online : true
    },
    {
        id: 'actuator-1',
        name: 'Light Switch',
        type: 'PHYSICAL' as DeviceType,
        role: 'ACTUATOR' as DeviceRole,
        currentState: '{}',
        simulationActive: false,
        simulationConfig: null,
        online : true
    }
];

describe('AddRuleForm', () => {
    it('should validate form and submit data', async () => {
        const onRuleAdded = vi.fn();
        const mockApiClient = vi.spyOn(apiClientModule, 'apiClient').mockResolvedValue({});

        render(<AddRuleForm devices={mockDevices} onRuleAdded={onRuleAdded} />);

        const submitBtn = screen.getByRole('button', { name: /Create Rule/i });

        expect(submitBtn).toBeDisabled();

        const nameInput = screen.getByLabelText(/Rule Name/i);
        fireEvent.change(nameInput, { target: { value: 'High Temp Alert' } });

        const valueInput = screen.getByLabelText(/Value/i);
        fireEvent.change(valueInput, { target: { value: '30' } });

        const comboBoxes = screen.getAllByRole('combobox');

        fireEvent.mouseDown(comboBoxes[0]);
        const triggerOption = await screen.findByRole('option', { name: 'Temp Sensor' });
        fireEvent.click(triggerOption);

        fireEvent.mouseDown(comboBoxes[2]);
        const actionOption = await screen.findByRole('option', { name: 'Light Switch' });
        fireEvent.click(actionOption);

        await waitFor(() => {
            expect(submitBtn).toBeEnabled();
        });

        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockApiClient).toHaveBeenCalledWith('/api/rules', expect.objectContaining({
                method: 'POST',
                body: expect.objectContaining({
                    name: 'High Temp Alert',
                    triggerConfig: expect.objectContaining({
                        deviceId: 'sensor-1',
                        value: '30'
                    }),
                    actionConfig: expect.objectContaining({
                        deviceId: 'actuator-1'
                    })
                })
            }));
        });

        expect(onRuleAdded).toHaveBeenCalled();
    }, 10000);
});