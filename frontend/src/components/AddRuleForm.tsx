import React, { useState } from 'react';
import type {Device} from '../types';
import { Box, Button, TextField, Select, MenuItem, FormControl, InputLabel, Typography, Grid, Paper, FormControlLabel, Switch } from '@mui/material';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

interface AddRuleFormProps {
    devices: Device[];
    onRuleAdded: () => void;
}

export function AddRuleForm({ devices, onRuleAdded }: AddRuleFormProps) {
    const [ruleName, setRuleName] = useState('');

    const [isTimeBased, setIsTimeBased] = useState(false);

    const [triggerDeviceId, setTriggerDeviceId] = useState('');
    const [triggerPath, setTriggerPath] = useState('$.temperature');
    const [triggerField, setTriggerField] = useState('temperature');
    const [triggerRange, setTriggerRange] = useState('5m');
    const [triggerAggregate, setTriggerAggregate] = useState('mean');

    const [triggerOperator, setTriggerOperator] = useState('GREATER_THAN');
    const [triggerValue, setTriggerValue] = useState('25');

    const [actionDeviceId, setActionDeviceId] = useState('');
    const [actionNewState, setActionNewState] = useState('{"status": "ON"}');

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        let triggerConfig;
        if (isTimeBased) {
            triggerConfig = {
                deviceId: triggerDeviceId,
                aggregate: triggerAggregate,
                field: triggerField,
                range: triggerRange,
                operator: triggerOperator,
                value: triggerValue,
            };
        } else {
            triggerConfig = {
                deviceId: triggerDeviceId,
                path: triggerPath,
                operator: triggerOperator,
                value: triggerValue,
            };
        }

        let newStateParsed;
        try {
            newStateParsed = JSON.parse(actionNewState);
        } catch {
            alert('Invalid JSON in Action New State');
            return;
        }

        const actionConfig = { deviceId: actionDeviceId, newState: newStateParsed };
        const newRule = { name: ruleName, triggerConfig, actionConfig };

        fetch(`${API_URL}/api/rules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRule),
        })
            .then(response => { if (!response.ok) throw new Error('Failed to create rule'); onRuleAdded(); setRuleName(''); })
            .catch(error => console.error('Error creating rule:', error));
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>Create New Rule</Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                    <TextField fullWidth label="Rule Name" value={ruleName} onChange={e => setRuleName(e.target.value)} required />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="subtitle1" gutterBottom>IF (Trigger)</Typography>
                        <FormControlLabel control={<Switch checked={isTimeBased} onChange={e => setIsTimeBased(e.target.checked)} />} label="Time-based Condition" sx={{ mb: 2 }}/>

                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Trigger Device</InputLabel>
                            <Select value={triggerDeviceId} label="Trigger Device" onChange={e => setTriggerDeviceId(e.target.value)} required>
                                {devices.filter(d => d.role === 'SENSOR').map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                            </Select>
                        </FormControl>

                        {isTimeBased ? (
                            <>
                                <FormControl fullWidth sx={{ mb: 2 }}>
                                    <InputLabel>Aggregate</InputLabel>
                                    <Select value={triggerAggregate} label="Aggregate" onChange={e => setTriggerAggregate(e.target.value)}>
                                        <MenuItem value="mean">Mean (Average)</MenuItem>
                                        <MenuItem value="max">Maximum</MenuItem>
                                        <MenuItem value="min">Minimum</MenuItem>
                                    </Select>
                                </FormControl>
                                <TextField fullWidth sx={{ mb: 2 }} label="Field (e.g., temperature)" value={triggerField} onChange={e => setTriggerField(e.target.value)} />
                                <TextField fullWidth sx={{ mb: 2 }} label="Time Range (e.g., 5m, 1h)" value={triggerRange} onChange={e => setTriggerRange(e.target.value)} />
                            </>
                        ) : (
                            <TextField fullWidth sx={{ mb: 2 }} label="JSON Path (e.g., $.temperature)" value={triggerPath} onChange={e => setTriggerPath(e.target.value)} />
                        )}

                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Operator</InputLabel>
                            <Select value={triggerOperator} label="Operator" onChange={e => setTriggerOperator(e.target.value)}>
                                <MenuItem value="EQUALS">EQUALS</MenuItem>
                                <MenuItem value="GREATER_THAN">GREATER_THAN</MenuItem>
                                <MenuItem value="LESS_THAN">LESS_THAN</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField fullWidth label="Value" value={triggerValue} onChange={e => setTriggerValue(e.target.value)} required />
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="subtitle1" gutterBottom>THEN (Action)</Typography>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Action Device</InputLabel>
                            <Select value={actionDeviceId} label="Action Device" onChange={e => setActionDeviceId(e.target.value)} required>
                                {devices.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField fullWidth multiline rows={4} label="New State (JSON)" value={actionNewState} onChange={e => setActionNewState(e.target.value)} />
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>Create Rule</Button>
                </Grid>
            </Grid>
        </Box>
    );
}