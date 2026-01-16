import React, { useState } from 'react';
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
    type SelectChangeEvent,
} from '@mui/material';
import { useAppStore } from '../stores/appStore';
import { DeviceType, DeviceRole, type DeviceRequest } from '../types';
import { apiClient } from '../api/apiClient';

export function AddDeviceForm() {
    const showSnackbar = useAppStore((state) => state.showSnackbar);
    const [name, setName] = useState('');
    const [role, setRole] = useState<DeviceRole>(DeviceRole.SENSOR);

    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value);
    };

    const handleRoleChange = (event: SelectChangeEvent) => {
        setRole(event.target.value as DeviceRole);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const newDevice: DeviceRequest = {
            name,
            type: DeviceType.VIRTUAL,
            role,
        };

        try {
            await apiClient('/api/devices', {
                method: 'POST',
                body: newDevice,
            });

            setName('');
            setRole(DeviceRole.SENSOR);
            showSnackbar('Virtual device created successfully!', 'success');
        } catch {
            // error handling in apiClient
        }
    };

    return (
        <Box
            component="form"
            onSubmit={(e) => void handleSubmit(e)}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
            <Typography variant="h6">Add Virtual Device</Typography>
            <TextField
                label="Device Name"
                variant="outlined"
                value={name}
                onChange={handleNameChange}
                required
                fullWidth
            />
            <FormControl fullWidth>
                <InputLabel id="role-select-label">Device Role</InputLabel>
                <Select
                    labelId="role-select-label"
                    value={role}
                    label="Device Role"
                    onChange={handleRoleChange}
                >
                    <MenuItem value={DeviceRole.SENSOR}>Sensor</MenuItem>
                    <MenuItem value={DeviceRole.ACTUATOR}>Actuator</MenuItem>
                </Select>
            </FormControl>
            <Button type="submit" variant="contained" color="primary">
                Add Device
            </Button>
        </Box>
    );
}