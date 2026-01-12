import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import type { Device } from '../types';
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    type SelectChangeEvent,
    TextField,
    Typography,
} from '@mui/material';

const API_URL = '';

interface EventSimulatorFormProps {
    readonly devices: Device[];
}

export function EventSimulatorForm({ devices }: EventSimulatorFormProps) {
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [newStateJson, setNewStateJson] = useState('{}');
    const [error, setError] = useState('');

    useEffect(() => {
        const isSelectedDevicePresent = devices.some((d) => d.id === selectedDeviceId);
        if (devices.length > 0 && !isSelectedDevicePresent) {
            setSelectedDeviceId(devices[0].id);
        }
    }, [devices, selectedDeviceId]);

    const handleDeviceChange = (event: SelectChangeEvent) => {
        setSelectedDeviceId(event.target.value);
    };

    const handleStateChange = (event: ChangeEvent<HTMLInputElement>) => {
        setNewStateJson(event.target.value);
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        setError('');

        try {
            JSON.parse(newStateJson);
        } catch {
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
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Failed to send event');
                }
            })
            .catch((err) => {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('An unknown error occurred');
                }
            });
    };

    let content: React.ReactNode;

    if (devices.length > 0) {
        content = (
            <>
                <FormControl fullWidth>
                    <InputLabel id="device-select-label">Select Device</InputLabel>
                    <Select
                        labelId="device-select-label"
                        value={selectedDeviceId}
                        label="Select Device"
                        onChange={handleDeviceChange}
                    >
                        {devices.map((device) => (
                            <MenuItem key={device.id} value={device.id}>
                                {device.name} ({device.id})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <TextField
                    label="New State (JSON)"
                    variant="outlined"
                    multiline
                    rows={3}
                    value={newStateJson}
                    onChange={handleStateChange}
                    error={!!error}
                    helperText={error}
                    fullWidth
                />

                <Button type="submit" variant="contained" color="secondary">
                    Send Event
                </Button>
            </>
        );
    } else {
        content = (
            <Typography variant="body2" color="text.secondary">
                Add a device to simulate events.
            </Typography>
        );
    }

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
            <Typography variant="h6">Event Simulator</Typography>
            {content}
        </Box>
    );
}