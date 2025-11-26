import React, { useState } from 'react';
import { Box, Button, TextField, Select, MenuItem, FormControl, InputLabel, Typography } from '@mui/material';
import {useAppStore} from "../stores/appStore.tsx";

const API_URL = '';

export function AddDeviceForm() {
    const showSnackbar = useAppStore((state) => state.showSnackbar);
    const [name, setName] = useState('');
    const [ioType, setIoType] = useState('SENSOR');

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        const newDevice = { name, type: 'VIRTUAL', ioType };

        fetch(`${API_URL}/api/devices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newDevice),
        })
            .then(response => {
                if (!response.ok) { throw new Error('Failed to create device'); }
                setName('');
                setIoType('SENSOR');
                showSnackbar('Virtual device created successfully!', 'success');
            })
            .catch(error => {
                console.error('Error creating device:', error)
                showSnackbar('Error creating device.', 'error');
            });

    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} // Używamy 'gap' do odstępów
        >
            <Typography variant="h6">Add Virtual Device</Typography>
            <TextField
                label="Device Name"
                variant="outlined"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                fullWidth
            />
            <FormControl fullWidth>
                <InputLabel id="io-type-select-label">I/O Type</InputLabel>
                <Select
                    labelId="io-type-select-label"
                    value={ioType}
                    label="I/O Type"
                    onChange={(e) => setIoType(e.target.value)}
                >
                    <MenuItem value="SENSOR">Sensor</MenuItem>
                    <MenuItem value="ACTUATOR">Actuator</MenuItem>
                </Select>
            </FormControl>
            <Button type="submit" variant="contained" color="primary">
                Add Device
            </Button>
        </Box>
    );
}