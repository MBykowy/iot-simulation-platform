import type {Device} from '../types';
import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    FormControlLabel,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import {useRuleForm} from '../hooks/useRuleForm';

interface AddRuleFormProps {
    devices: Device[];
    onRuleAdded: () => void;
}

export function AddRuleForm({ devices, onRuleAdded }: AddRuleFormProps) {
    const { formData, isSubmitting, isFormValid, updateField, handleSubmit } = useRuleForm(onRuleAdded);

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>Create New Rule</Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                    <TextField fullWidth label="Rule Name" value={formData.name} onChange={e => updateField('name', e.target.value)} required disabled={isSubmitting} />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="subtitle1" gutterBottom>IF (Trigger)</Typography>
                        <FormControlLabel control={<Switch checked={formData.isTimeBased} onChange={e => updateField('isTimeBased', e.target.checked)} />} label="Time-based Condition" sx={{ mb: 2 }} disabled={isSubmitting} />

                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Trigger Device</InputLabel>
                            <Select value={formData.triggerDeviceId} label="Trigger Device" onChange={e => updateField('triggerDeviceId', e.target.value)} required disabled={isSubmitting}>
                                {devices.filter(d => d.role === 'SENSOR').map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                            </Select>
                        </FormControl>

                        {formData.isTimeBased ? (
                            <>
                                <FormControl fullWidth sx={{ mb: 2 }}>
                                    <InputLabel>Aggregate</InputLabel>
                                    <Select value={formData.triggerAggregate} label="Aggregate" onChange={e => updateField('triggerAggregate', e.target.value as typeof formData.triggerAggregate)} disabled={isSubmitting}>
                                        <MenuItem value="mean">Mean (Average)</MenuItem>
                                        <MenuItem value="max">Maximum</MenuItem>
                                        <MenuItem value="min">Minimum</MenuItem>
                                    </Select>
                                </FormControl>
                                <TextField fullWidth sx={{ mb: 2 }} label="Field (e.g., temperature)" value={formData.triggerField} onChange={e => updateField('triggerField', e.target.value)} disabled={isSubmitting} />
                                <TextField fullWidth sx={{ mb: 2 }} label="Time Range (e.g., 5m, 1h)" value={formData.triggerRange} onChange={e => updateField('triggerRange', e.target.value)} disabled={isSubmitting} />
                            </>
                        ) : (
                            <TextField fullWidth sx={{ mb: 2 }} label="JSON Path (e.g., $.temperature)" value={formData.triggerPath} onChange={e => updateField('triggerPath', e.target.value)} disabled={isSubmitting} />
                        )}

                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Operator</InputLabel>
                            <Select value={formData.triggerOperator} label="Operator" onChange={e => updateField('triggerOperator', e.target.value as typeof formData.triggerOperator)} disabled={isSubmitting}>
                                <MenuItem value="EQUALS">EQUALS</MenuItem>
                                <MenuItem value="GREATER_THAN">GREATER_THAN</MenuItem>
                                <MenuItem value="LESS_THAN">LESS_THAN</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField fullWidth label="Value" value={formData.triggerValue} onChange={e => updateField('triggerValue', e.target.value)} required disabled={isSubmitting} />
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="subtitle1" gutterBottom>THEN (Action)</Typography>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Action Device</InputLabel>
                            <Select value={formData.actionDeviceId} label="Action Device" onChange={e => updateField('actionDeviceId', e.target.value)} required disabled={isSubmitting}>
                                {devices.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField fullWidth multiline rows={4} label="New State (JSON)" value={formData.actionNewState} onChange={e => updateField('actionNewState', e.target.value)} disabled={isSubmitting} />
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }} disabled={isSubmitting || !isFormValid}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Create Rule'}
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
}