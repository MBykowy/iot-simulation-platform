import React, { useState } from 'react';
import { Device } from '../types';
import { Box, Button, TextField, Select, MenuItem, FormControl, InputLabel, Typography, Grid, Paper } from '@mui/material';

const API_URL = 'http://localhost:8081';

interface AddRuleFormProps {
    devices: Device[];
    onRuleAdded: () => void; // Funkcja do odświeżenia listy reguł
}

export function AddRuleForm({ devices, onRuleAdded }: AddRuleFormProps) {
    const [ruleName, setRuleName] = useState('');

    // Stany dla Triggera
    const [triggerDeviceId, setTriggerDeviceId] = useState('');
    const [triggerPath, setTriggerPath] = useState('$.temperature');
    const [triggerOperator, setTriggerOperator] = useState('GREATER_THAN');
    const [triggerValue, setTriggerValue] = useState('25');

    // Stany dla Akcji
    const [actionDeviceId, setActionDeviceId] = useState('');
    const [actionNewState, setActionNewState] = useState('{"status": "ON"}');

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        // Budujemy obiekty config
        const triggerConfig = {
            deviceId: triggerDeviceId,
            path: triggerPath,
            operator: triggerOperator,
            value: triggerValue,
        };

        let newStateParsed;
        try {
            newStateParsed = JSON.parse(actionNewState);
        } catch {
            alert('Invalid JSON in Action New State');
            return;
        }

        const actionConfig = {
            deviceId: actionDeviceId,
            newState: newStateParsed
        };

        const newRule = {
            name: ruleName,
            triggerConfig,
            actionConfig,
        };

        fetch(`${API_URL}/api/rules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRule),
        })
            .then(response => {
                if (!response.ok) throw new Error('Failed to create rule');
                onRuleAdded(); // Informujemy rodzica o sukcesie
                // Reset formularza
                setRuleName('');
            })
            .catch(error => console.error('Error creating rule:', error));
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>Create New Rule</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <TextField fullWidth label="Rule Name" value={ruleName} onChange={e => setRuleName(e.target.value)} required />
                </Grid>

                {/* Sekcja Trigger */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>IF (Trigger)</Typography>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Trigger Device</InputLabel>
                            <Select value={triggerDeviceId} label="Trigger Device" onChange={e => setTriggerDeviceId(e.target.value)}>
                                {devices.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField fullWidth sx={{ mb: 2 }} label="JSON Path" value={triggerPath} onChange={e => setTriggerPath(e.target.value)} />
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Operator</InputLabel>
                            <Select value={triggerOperator} label="Operator" onChange={e => setTriggerOperator(e.target.value)}>
                                <MenuItem value="EQUALS">EQUALS</MenuItem>
                                <MenuItem value="GREATER_THAN">GREATER_THAN</MenuItem>
                                <MenuItem value="LESS_THAN">LESS_THAN</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField fullWidth label="Value" value={triggerValue} onChange={e => setTriggerValue(e.target.value)} />
                    </Paper>
                </Grid>

                {/* Sekcja Action */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>THEN (Action)</Typography>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Action Device</InputLabel>
                            <Select value={actionDeviceId} label="Action Device" onChange={e => setActionDeviceId(e.target.value)}>
                                {devices.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField fullWidth multiline rows={3} label="New State (JSON)" value={actionNewState} onChange={e => setActionNewState(e.target.value)} />
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Button type="submit" variant="contained" color="primary" fullWidth>Create Rule</Button>
                </Grid>
            </Grid>
        </Box>
    );
}