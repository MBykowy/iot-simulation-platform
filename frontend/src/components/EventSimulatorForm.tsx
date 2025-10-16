import React, { useState, useEffect } from 'react';
import type {Device} from '../types';
// Importy komponentów MUI
import { Box, Button, TextField, Select, MenuItem, FormControl, InputLabel, Typography } from '@mui/material';

const API_URL = 'http://localhost:8081';

interface EventSimulatorFormProps {
    devices: Device[];
}

export function EventSimulatorForm({ devices }: EventSimulatorFormProps) {
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [newStateJson, setNewStateJson] = useState('{}');
    const [error, setError] = useState('');

    // Efekt do ustawienia domyślnej wartości, gdy lista urządzeń się zmieni
    useEffect(() => {
        if (devices.length > 0 && !devices.find(d => d.id === selectedDeviceId)) {
            setSelectedDeviceId(devices[0].id);
        }
    }, [devices, selectedDeviceId]);


    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        try {
            JSON.parse(newStateJson);
        } catch (e) {
            setError('Invalid JSON format.');
            return;
        }

        const eventPayload = {
            deviceId: selectedDeviceId,
            state: newStateJson,
        };

        fetch(`${API_URL}/api/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventPayload),
        })
            .then(response => {
                if (!response.ok) { throw new Error('Failed to send event'); }
                console.log('Event sent successfully for device:', selectedDeviceId);
            })
            .catch(err => setError(err.message));
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
            <Typography variant="h6">Event Simulator</Typography>
            {devices.length > 0 ? (
                <>
                    <FormControl fullWidth>
                        <InputLabel id="device-select-label">Select Device</InputLabel>
                        <Select
                            labelId="device-select-label"
                            value={selectedDeviceId}
                            label="Select Device"
                            onChange={(e) => setSelectedDeviceId(e.target.value)}
                        >
                            {devices.map(device => (
                                <MenuItem key={device.id} value={device.id}>
                                    {device.name} ({device.id})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        label="New State (JSON)"
                        variant="outlined"
                        multiline // Umożliwia wpisanie wielu linii
                        rows={3}
                        value={newStateJson}
                        onChange={(e) => setNewStateJson(e.target.value)}
                        error={!!error} // Pole staje się czerwone w razie błędu
                        helperText={error} // Wyświetla komunikat o błędzie pod polem
                        fullWidth
                    />

                    <Button type="submit" variant="contained" color="secondary">
                        Send Event
                    </Button>
                </>
            ) : (
                <Typography variant="body2" color="text.secondary">
                    Add a device to simulate events.
                </Typography>
            )}
        </Box>
    );
}