import { useEffect, useState, useCallback, type ChangeEvent } from 'react';
import { type Device, type SimulationConfig, type SimulationFieldConfig, SimulationPattern } from '../types';
import {
    Box,
    Button,
    Divider,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Modal,
    Paper,
    Select,
    type SelectChangeEvent,
    Slider,
    TextField,
    Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAppStore } from '../stores/appStore';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import { API_URL } from '../api/apiClient';

const DEFAULT_INTERVAL_MS = 2000;

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 600,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    borderRadius: 3,
} as const;

interface SimulationField {
    id: number;
    name: string;
    pattern: SimulationPattern;
    parameters: Record<string, number>;
}

interface SimulationConfigModalProps {
    readonly device: Device | null;
    readonly open: boolean;
    readonly onClose: () => void;
}

export function SimulationConfigModal({ device, open, onClose }: SimulationConfigModalProps) {
    const [intervalMs, setIntervalMs] = useState(DEFAULT_INTERVAL_MS);
    const [fields, setFields] = useState<SimulationField[]>([]);
    const [latency, setLatency] = useState<number>(0);
    const [packetLoss, setPacketLoss] = useState<number>(0);
    const showSnackbar = useAppStore((state) => state.showSnackbar);

    useEffect(() => {
        const loadDefaults = () => {
            setFields([{
                id: Date.now(),
                name: 'temperature',
                pattern: SimulationPattern.SINE,
                parameters: { amplitude: 5, period: 30, offset: 20 },
            }]);
            setIntervalMs(DEFAULT_INTERVAL_MS);
            setLatency(0);
            setPacketLoss(0);
        };

        if (device?.simulationConfig) {
            try {
                const config = JSON.parse(device.simulationConfig) as SimulationConfig;
                setIntervalMs(config.intervalMs || DEFAULT_INTERVAL_MS);

                if (config.networkProfile) {
                    setLatency(config.networkProfile.latencyMs || 0);
                    setPacketLoss(config.networkProfile.packetLossPercent || 0);
                } else {
                    setLatency(0);
                    setPacketLoss(0);
                }

                const loadedFields = Object.entries(config.fields).map(
                    ([name, fieldConfig], index) => ({
                        id: Date.now() + index,
                        name,
                        pattern: fieldConfig.pattern,
                        parameters: fieldConfig.parameters,
                    }),
                );
                setFields(loadedFields);
            } catch {
                showSnackbar('Configuration corrupted. Resetting to defaults.', 'warning');
                loadDefaults();
            }
        } else {
            loadDefaults();
        }
    }, [device, open, showSnackbar]); // Added 'open' to reset on re-open

    const handleIntervalChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setIntervalMs(Number(event.target.value));
    }, []);

    const handleLatencyChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setLatency(Number(event.target.value));
    }, []);

    const handlePacketLossChange = useCallback((_event: Event, newValue: number | number[]) => {
        setPacketLoss(newValue as number);
    }, []);

    const handleStart = useCallback(async () => {
        if (!device) {
            return;
        }

        const fieldsAsMap = fields.reduce((acc, field) => {
            if (field.name) {
                acc[field.name] = { pattern: field.pattern, parameters: field.parameters };
            }
            return acc;
        }, {} as Record<string, SimulationFieldConfig>);

        const body: SimulationConfig = {
            intervalMs,
            fields: fieldsAsMap,
            networkProfile: { latencyMs: latency, packetLossPercent: packetLoss },
        };

        try {
            const response = await fetch(`${API_URL}/api/devices/${device.id}/simulation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}`);
            }
            onClose();
            showSnackbar('Simulation updated with network profile', 'success');
        } catch {
            showSnackbar('Failed to update simulation', 'error');
        }
    }, [device, fields, intervalMs, latency, packetLoss, onClose, showSnackbar]);

    const handleStop = useCallback(async () => {
        if (!device) {
            return;
        }
        try {
            const response = await fetch(`${API_URL}/api/devices/${device.id}/simulation`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error(`Error ${response.status}: Failed to stop simulation`);
            }
            onClose();
            showSnackbar('Simulation stopped', 'info');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            showSnackbar(message, 'error');
        }
    }, [device, onClose, showSnackbar]);

    const addField = useCallback(() => {
        setFields((prev) => [
            ...prev,
            {
                id: Date.now(),
                name: '',
                pattern: SimulationPattern.RANDOM,
                parameters: { min: 0, max: 100 },
            },
        ]);
    }, []);

    const handleRemoveField = useCallback((id: number) => {
        setFields((prev) => prev.filter((f) => f.id !== id));
    }, []);

    const handleFieldNameChange = useCallback((id: number, event: ChangeEvent<HTMLInputElement>) => {
        setFields((prev) => prev.map((f) => (f.id === id ? { ...f, name: event.target.value } : f)));
    }, []);

    const handleFieldPatternChange = useCallback((id: number, event: SelectChangeEvent) => {
        setFields((prev) => prev.map((f) => (f.id === id ? { ...f, pattern: event.target.value as SimulationPattern } : f)));
    }, []);

    const handleFieldParamChange = useCallback((id: number, paramName: string, event: ChangeEvent<HTMLInputElement>) => {
        let val = Number(event.target.value);
        if (paramName === 'period' || paramName === 'latencyMs') {
            val = Math.max(0, val);
        }
        setFields((prev) =>
            prev.map((f) => {
                if (f.id === id) {
                    return { ...f, parameters: { ...f.parameters, [paramName]: val } };
                }
                return f;
            }),
        );
    }, []);

    const renderParams = useCallback((field: SimulationField) => {
        const createHandler = (paramName: string) => (event: ChangeEvent<HTMLInputElement>) => {
            handleFieldParamChange(field.id, paramName, event);
        };

        if (field.pattern === SimulationPattern.SINE) {
            return (
                <>
                    <TextField size='small' label='Amplitude' type='number' value={field.parameters.amplitude ?? ''} onChange={createHandler('amplitude')} />
                    <TextField size='small' label='Period (s)' type='number' value={field.parameters.period ?? ''} onChange={createHandler('period')} />
                    <TextField size='small' label='Offset' type='number' value={field.parameters.offset ?? ''} onChange={createHandler('offset')} />
                </>
            );
        }
        if (field.pattern === SimulationPattern.RANDOM) {
            return (
                <>
                    <TextField size='small' label='Min Value' type='number' value={field.parameters.min ?? ''} onChange={createHandler('min')} />
                    <TextField size='small' label='Max Value' type='number' value={field.parameters.max ?? ''} onChange={createHandler('max')} />
                </>
            );
        }
        return null;
    }, [handleFieldParamChange]);

    let sliderColor: 'error' | 'primary';
    if (packetLoss > 0) {
        sliderColor = 'error';
    } else {
        sliderColor = 'primary';
    }

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={{ ...style, maxHeight: '90vh', overflowY: 'auto' }}>
                <Typography variant='h6' component='h2' gutterBottom>
                    Configure Simulation: {device?.name}
                </Typography>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField fullWidth label='Interval (ms)' type='number' value={intervalMs} onChange={handleIntervalChange} size='small' />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Paper variant='outlined' sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                                <NetworkCheckIcon color='secondary' />
                                <Typography variant='subtitle2' fontWeight='bold'>Network Conditions Simulation</Typography>
                            </Box>
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField fullWidth label='Added Latency (ms)' type='number' value={latency} onChange={handleLatencyChange} size='small' helperText='Simulates network lag' />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Typography gutterBottom variant='caption'>Packet Loss: {packetLoss}%</Typography>
                                    <Slider value={packetLoss} onChange={handlePacketLossChange} valueLabelDisplay='auto' min={0} max={50} step={1} color={sliderColor} />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Divider sx={{ my: 2 }}><Typography variant='caption' color='text.secondary'>DATA FIELDS</Typography></Divider>
                        {fields.map((field) => (
                            <Paper key={field.id} variant='outlined' sx={{ p: 2, mb: 2 }}>
                                <Grid container spacing={2} alignItems='center'>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <TextField fullWidth size='small' label='Field Name' value={field.name} onChange={(e: ChangeEvent<HTMLInputElement>) => handleFieldNameChange(field.id, e)} />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <FormControl fullWidth size='small'>
                                            <InputLabel>Pattern</InputLabel>
                                            <Select value={field.pattern} label='Pattern' onChange={(e: SelectChangeEvent) => handleFieldPatternChange(field.id, e)}>
                                                <MenuItem value={SimulationPattern.SINE}>Sine Wave</MenuItem>
                                                <MenuItem value={SimulationPattern.RANDOM}>Random</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }} sx={{ textAlign: 'right' }}>
                                        <IconButton onClick={() => handleRemoveField(field.id)} color='warning'><DeleteIcon /></IconButton>
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>{renderParams(field)}</Box>
                                    </Grid>
                                </Grid>
                            </Paper>
                        ))}
                        <Button startIcon={<AddCircleOutlineIcon />} onClick={addField} sx={{ mt: 1 }}>Add Field</Button>
                    </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Button variant='contained' color='error' onClick={handleStop} disabled={!device?.simulationActive}>Stop Simulation</Button>
                    <Button variant='contained' color='primary' onClick={handleStart}>Start / Update</Button>
                </Box>
            </Box>
        </Modal>
    );
}