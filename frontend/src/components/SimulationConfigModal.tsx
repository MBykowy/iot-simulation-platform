import { useState, useEffect } from 'react';
import type { Device } from '../types';
import { Modal, Box, Typography, Button, Select, MenuItem, TextField, FormControl, InputLabel, Grid, Paper, IconButton } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 600,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    borderRadius: 3,
};

interface SimulationField {
    id: number;
    name: string;
    pattern: 'SINE' | 'RANDOM';
    parameters: Record<string, number>;
}

interface SimulationConfigModalProps {
    device: Device | null;
    open: boolean;
    onClose: () => void;
}

export function SimulationConfigModal({ device, open, onClose }: SimulationConfigModalProps) {
    const [intervalMs, setIntervalMs] = useState(2000);
    const [fields, setFields] = useState<SimulationField[]>([]);

    useEffect(() => {
        if (device?.simulationConfig) {
            try {
                const config = JSON.parse(device.simulationConfig);
                setIntervalMs(config.intervalMs || 2000);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const loadedFields = Object.entries(config.fields).map(([name, fieldConfig]: [string, any], index) => ({
                    id: index,
                    name,
                    pattern: fieldConfig.pattern,
                    parameters: fieldConfig.parameters,
                }));
                setFields(loadedFields);
            } catch (e) { console.error("Failed to parse simulation config", e); }
        } else {
            setFields([{ id: 0, name: 'temperature', pattern: 'SINE', parameters: { amplitude: 5, period: 30, offset: 20 } }]);
            setIntervalMs(2000);
        }
    }, [device]);

    const addField = () => {
        setFields(prev => [...prev, { id: Date.now(), name: '', pattern: 'RANDOM', parameters: { min: 0, max: 100 } }]);
    };

    const removeField = (id: number) => {
        setFields(prev => prev.filter(f => f.id !== id));
    };

    const updateField = <K extends keyof SimulationField>(id: number, key: K, value: SimulationField[K]) => {
        setFields(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f));
    };

    const handleStart = () => {
        if (!device) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fieldsAsMap = fields.reduce((acc, field) => {
            if (field.name) {
                acc[field.name] = { pattern: field.pattern, parameters: field.parameters };
            }
            return acc;
        }, {} as Record<string, any>);

        const body = { intervalMs, fields: fieldsAsMap };

        fetch(`${API_URL}/api/devices/${device.id}/simulation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(onClose).catch(console.error);
    };

    const handleStop = () => {
        if (!device) return;
        fetch(`${API_URL}/api/devices/${device.id}/simulation`, {
            method: 'DELETE'
        }).then(onClose).catch(console.error);
    };

    const renderParams = (field: SimulationField) => {
        const handleParamChange = (paramName: string, value: string) => {
            updateField(field.id, 'parameters', { ...field.parameters, [paramName]: Number(value) });
        };

        if (field.pattern === 'SINE') {
            return <>
                <TextField size="small" label="Amplitude" type="number" value={field.parameters.amplitude || ''} onChange={e => handleParamChange('amplitude', e.target.value)} />
                <TextField size="small" label="Period (s)" type="number" value={field.parameters.period || ''} onChange={e => handleParamChange('period', e.target.value)} />
                <TextField size="small" label="Offset" type="number" value={field.parameters.offset || ''} onChange={e => handleParamChange('offset', e.target.value)} />
            </>;
        }
        if (field.pattern === 'RANDOM') {
            return <>
                <TextField size="small" label="Min Value" type="number" value={field.parameters.min || ''} onChange={e => handleParamChange('min', e.target.value)} />
                <TextField size="small" label="Max Value" type="number" value={field.parameters.max || ''} onChange={e => handleParamChange('max', e.target.value)} />
            </>;
        }
        return null;
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={{...style, maxHeight: '90vh', overflowY: 'auto' }}>
                <Typography variant="h6" component="h2">Configure Simulation: {device?.name}</Typography>
                <TextField fullWidth label="Interval (ms)" type="number" value={intervalMs} onChange={e => setIntervalMs(Number(e.target.value))} sx={{ my: 2 }} />

                {fields.map((field) => (
                    <Paper key={field.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField fullWidth size="small" label="Field Name" value={field.name} onChange={e => updateField(field.id, 'name', e.target.value)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Pattern</InputLabel>
                                    <Select value={field.pattern} label="Pattern" onChange={e => updateField(field.id, 'pattern', e.target.value as any)}>
                                        <MenuItem value="SINE">Sine Wave</MenuItem>
                                        <MenuItem value="RANDOM">Random</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }} sx={{ textAlign: 'right' }}>
                                <IconButton onClick={() => removeField(field.id)} color="warning"><DeleteIcon /></IconButton>
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>{renderParams(field)}</Box>
                            </Grid>
                        </Grid>
                    </Paper>
                ))}

                <Button startIcon={<AddCircleOutlineIcon />} onClick={addField} sx={{ mt: 1 }}>Add Field</Button>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Button variant="contained" color="error" onClick={handleStop} disabled={!device?.simulationActive}>Stop Simulation</Button>
                    <Button variant="contained" color="primary" onClick={handleStart}>Start / Update</Button>
                </Box>
            </Box>
        </Modal>
    );
}