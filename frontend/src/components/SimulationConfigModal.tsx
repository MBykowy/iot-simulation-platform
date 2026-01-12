import { useEffect, useState } from 'react';
import type { Device, SimulationConfig, SimulationFieldConfig, SimulationPattern } from '../types';
import {
    Box,
    Button, Divider,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Modal,
    Paper,
    Select,
    type SelectChangeEvent, Slider,
    TextField,
    Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAppStore } from '../stores/appStore';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';

const API_URL = import.meta.env.VITE_API_URL || globalThis.location.origin;
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
        if (device?.simulationConfig) {
            try {
                const config = JSON.parse(device.simulationConfig) as SimulationConfig;
                setIntervalMs(config.intervalMs || DEFAULT_INTERVAL_MS);

                // Load Network Profile
                if (config.networkProfile) {
                    setLatency(config.networkProfile.latencyMs || 0);
                    setPacketLoss(config.networkProfile.packetLossPercent || 0);
                } else {
                    setLatency(0);
                    setPacketLoss(0);
                }

                const loadedFields = Object.entries(config.fields).map(
                    ([name, fieldConfig], index) => ({
                        id: index,
                        name,
                        pattern: fieldConfig.pattern,
                        parameters: fieldConfig.parameters,
                    }),
                );
                setFields(loadedFields);
            } catch {
                // Ignore parse error
            }
        } else {
            setFields([{ id: 0, name: 'temperature', pattern: 'SINE', parameters: { amplitude: 5, period: 30, offset: 20 } }]);
            setIntervalMs(DEFAULT_INTERVAL_MS);
            setLatency(0);
            setPacketLoss(0);
        }
    }, [device]);


    const updateFieldName = (prevFields: SimulationField[], id: number, newName: string) => {
        return prevFields.map((f) => {
            if (f.id === id) {
                return { ...f, name: newName };
            }
            return f;
        });
    };

    const updateFieldPattern = (
        prevFields: SimulationField[],
        id: number,
        newPattern: SimulationPattern,
    ) => {
        return prevFields.map((f) => {
            if (f.id === id) {
                return { ...f, pattern: newPattern };
            }
            return f;
        });
    };

    const updateFieldParam = (
        prevFields: SimulationField[],
        id: number,
        paramName: string,
        value: number,
    ) => {
        return prevFields.map((f) => {
            if (f.id === id) {
                return {
                    ...f,
                    parameters: {
                        ...f.parameters,
                        [paramName]: value,
                    },
                };
            }
            return f;
        });
    };


    const handleIntervalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setIntervalMs(Number(event.target.value));
    };

    const handleLatencyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLatency(Number(event.target.value));
    };

    const handlePacketLossChange = (_event: Event, newValue: number | number[]) => {
        setPacketLoss(newValue as number);
    };

    const handleStart = async () => {
        if (!device) {return;}

        const fieldsAsMap = fields.reduce((acc, field) => {
            if (field.name) {
                acc[field.name] = { pattern: field.pattern, parameters: field.parameters };
            }
            return acc;
        }, {} as Record<string, SimulationFieldConfig>);

        const body: SimulationConfig = {
            intervalMs,
            fields: fieldsAsMap,
            networkProfile: {
                latencyMs: latency,
                packetLossPercent: packetLoss
            }
        };

        try {
            const response = await fetch(`${API_URL}/api/devices/${device.id}/simulation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {throw new Error(`Error ${response.status}`);}
            onClose();
            showSnackbar('Simulation updated with network profile', 'success');
        } catch {
            showSnackbar('Failed to update simulation', 'error');
        }
    };

    const addField = () => {
        setFields((prev) => [
            ...prev,
            {
                id: Date.now(),
                name: '',
                pattern: 'RANDOM',
                parameters: { min: 0, max: 100 },
            },
        ]);
    };

    const createRemoveFieldHandler = (id: number) => () => {
        setFields((prev) => prev.filter((f) => f.id !== id));
    };

    const createUpdateNameHandler =
        (id: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
            setFields((prev) => updateFieldName(prev, id, event.target.value));
        };

    const createUpdatePatternHandler = (id: number) => (event: SelectChangeEvent) => {
        setFields((prev) =>
            updateFieldPattern(prev, id, event.target.value as SimulationPattern),
        );
    };

    const createParamChangeHandler =
        (id: number, paramName: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
            let val = Number(event.target.value);

            if (paramName === 'period' || paramName === 'latencyMs') {
                val = Math.max(0, val);
            }

            setFields((prev) =>
                updateFieldParam(prev, id, paramName, val),
            );
        };


    const handleStop = async () => {
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
            let message = 'Unknown error occurred';
            if (error instanceof Error) {
                message = error.message;
            }
            showSnackbar(message, 'error');
        }
    };

    const renderParams = (field: SimulationField) => {
        if (field.pattern === 'SINE') {
            return (
                <>
                    <TextField
                        size="small"
                        label="Amplitude"
                        type="number"
                        value={field.parameters.amplitude || ''}
                        onChange={createParamChangeHandler(field.id, 'amplitude')}
                    />
                    <TextField
                        size="small"
                        label="Period (s)"
                        type="number"
                        value={field.parameters.period || ''}
                        onChange={createParamChangeHandler(field.id, 'period')}
                    />
                    <TextField
                        size="small"
                        label="Offset"
                        type="number"
                        value={field.parameters.offset || ''}
                        onChange={createParamChangeHandler(field.id, 'offset')}
                    />
                </>
            );
        }
        if (field.pattern === 'RANDOM') {
            return (
                <>
                    <TextField
                        size="small"
                        label="Min Value"
                        type="number"
                        value={field.parameters.min || ''}
                        onChange={createParamChangeHandler(field.id, 'min')}
                    />
                    <TextField
                        size="small"
                        label="Max Value"
                        type="number"
                        value={field.parameters.max || ''}
                        onChange={createParamChangeHandler(field.id, 'max')}
                    />
                </>
            );
        }
        return null;
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={{ ...style, maxHeight: '90vh', overflowY: 'auto' }}>
                <Typography variant="h6" component="h2" gutterBottom>
                    Configure Simulation: {device?.name}
                </Typography>

                <Grid container spacing={3}>
                    {/* General Settings */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Interval (ms)"
                            type="number"
                            value={intervalMs}
                            onChange={handleIntervalChange}
                            size="small"
                        />
                    </Grid>

                    {/* Network Simulation Section */}
                    <Grid size={{ xs: 12 }}>
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                                <NetworkCheckIcon color="secondary" />
                                <Typography variant="subtitle2" fontWeight="bold">
                                    Network Conditions Simulation
                                </Typography>
                            </Box>

                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="Added Latency (ms)"
                                        type="number"
                                        value={latency}
                                        onChange={handleLatencyChange}
                                        size="small"
                                        helperText="Simulates network lag"
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Typography gutterBottom variant="caption">
                                        Packet Loss: {packetLoss}%
                                    </Typography>
                                    <Slider
                                        value={packetLoss}
                                        onChange={handlePacketLossChange}
                                        valueLabelDisplay="auto"
                                        min={0}
                                        max={50}
                                        step={1}
                                        color={packetLoss > 0 ? "error" : "primary"}
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Divider sx={{ my: 2 }}>
                            <Typography variant="caption" color="text.secondary">DATA FIELDS</Typography>
                        </Divider>

                        {fields.map((field) => (
                            <Paper key={field.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
                                <Grid container spacing={2} alignItems="center">
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Field Name"
                                            value={field.name}
                                            onChange={createUpdateNameHandler(field.id)}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Pattern</InputLabel>
                                            <Select
                                                value={field.pattern}
                                                label="Pattern"
                                                onChange={createUpdatePatternHandler(field.id)}
                                            >
                                                <MenuItem value="SINE">Sine Wave</MenuItem>
                                                <MenuItem value="RANDOM">Random</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }} sx={{ textAlign: 'right' }}>
                                        <IconButton
                                            onClick={createRemoveFieldHandler(field.id)}
                                            color="warning"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                            {renderParams(field)}
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Paper>
                        ))}

                        <Button startIcon={<AddCircleOutlineIcon />} onClick={addField} sx={{ mt: 1 }}>
                            Add Field
                        </Button>
                    </Grid>
                </Grid>

                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mt: 3,
                        pt: 2,
                        borderTop: 1,
                        borderColor: 'divider',
                    }}
                >
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleStop}
                        disabled={!device?.simulationActive}
                    >
                        Stop Simulation
                    </Button>
                    <Button variant="contained" color="primary" onClick={handleStart}>
                        Start / Update
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
}