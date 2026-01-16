import type { ChangeEvent } from 'react';
import { type Device, AggregateFunction, RuleOperator } from '../types';
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
    type SelectChangeEvent,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import { useRuleForm } from '../hooks/useRuleForm';

interface AddRuleFormProps {
    readonly devices: Device[];
    readonly onRuleAdded: () => void;
}

export function AddRuleForm({ devices, onRuleAdded }: AddRuleFormProps) {
    const { formData, isSubmitting, isFormValid, updateField, handleSubmit } = useRuleForm(onRuleAdded);

    const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
        updateField('name', event.target.value);
    };

    const handleIsTimeBasedChange = (event: ChangeEvent<HTMLInputElement>) => {
        updateField('isTimeBased', event.target.checked);
    };

    const handleTriggerDeviceChange = (event: SelectChangeEvent) => {
        updateField('triggerDeviceId', event.target.value);
    };

    const handleTriggerAggregateChange = (event: SelectChangeEvent) => {
        updateField('triggerAggregate', event.target.value as AggregateFunction);
    };

    const handleTriggerFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
        updateField('triggerField', event.target.value);
    };

    const handleTriggerRangeChange = (event: ChangeEvent<HTMLInputElement>) => {
        updateField('triggerRange', event.target.value);
    };

    const handleTriggerPathChange = (event: ChangeEvent<HTMLInputElement>) => {
        updateField('triggerPath', event.target.value);
    };

    const handleTriggerOperatorChange = (event: SelectChangeEvent) => {
        updateField('triggerOperator', event.target.value as RuleOperator);
    };

    const handleTriggerValueChange = (event: ChangeEvent<HTMLInputElement>) => {
        updateField('triggerValue', event.target.value);
    };

    const handleActionDeviceChange = (event: SelectChangeEvent) => {
        updateField('actionDeviceId', event.target.value);
    };

    const handleActionNewStateChange = (event: ChangeEvent<HTMLInputElement>) => {
        updateField('actionNewState', event.target.value);
    };

    let triggerFields: React.ReactNode;

    if (formData.isTimeBased) {
        triggerFields = (
            <>
                <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Aggregate</InputLabel>
                    <Select
                        value={formData.triggerAggregate}
                        label="Aggregate"
                        onChange={handleTriggerAggregateChange}
                        disabled={isSubmitting}
                    >
                        <MenuItem value={AggregateFunction.MEAN}>Mean (Average)</MenuItem>
                        <MenuItem value={AggregateFunction.MAX}>Maximum</MenuItem>
                        <MenuItem value={AggregateFunction.MIN}>Minimum</MenuItem>
                        <MenuItem value={AggregateFunction.SUM}>Sum</MenuItem>
                        <MenuItem value={AggregateFunction.COUNT}>Count</MenuItem>
                    </Select>
                </FormControl>
                <TextField
                    fullWidth
                    sx={{ mb: 2 }}
                    label="Field (e.g., temperature)"
                    value={formData.triggerField}
                    onChange={handleTriggerFieldChange}
                    disabled={isSubmitting}
                />
                <TextField
                    fullWidth
                    sx={{ mb: 2 }}
                    label="Time Range (e.g., 5m, 1h)"
                    value={formData.triggerRange}
                    onChange={handleTriggerRangeChange}
                    disabled={isSubmitting}
                />
            </>
        );
    } else {
        triggerFields = (
            <TextField
                fullWidth
                sx={{ mb: 2 }}
                label="JSON Path (e.g., $.temperature)"
                value={formData.triggerPath}
                onChange={handleTriggerPathChange}
                disabled={isSubmitting}
            />
        );
    }

    let submitButtonContent: React.ReactNode;
    if (isSubmitting) {
        submitButtonContent = <CircularProgress size={24} />;
    } else {
        submitButtonContent = 'Create Rule';
    }

    const sensorMenuItems = devices
        .filter((d) => d.role === 'SENSOR')
        .map((d) => (
            <MenuItem key={d.id} value={d.id}>
                {d.name}
            </MenuItem>
        ));

    const actionMenuItems = devices.map((d) => (
        <MenuItem key={d.id} value={d.id}>
            {d.name}
        </MenuItem>
    ));

    const timeBasedSwitch = (
        <Switch
            checked={formData.isTimeBased}
            onChange={handleIsTimeBasedChange}
        />
    );

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
                Create New Rule
            </Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                    <TextField
                        fullWidth
                        label="Rule Name"
                        value={formData.name}
                        onChange={handleNameChange}
                        required
                        disabled={isSubmitting}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="subtitle1" gutterBottom>
                            IF (Trigger)
                        </Typography>
                        <FormControlLabel
                            control={timeBasedSwitch}
                            label="Time-based Condition"
                            sx={{ mb: 2 }}
                            disabled={isSubmitting}
                        />

                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Trigger Device</InputLabel>
                            <Select
                                value={formData.triggerDeviceId}
                                label="Trigger Device"
                                onChange={handleTriggerDeviceChange}
                                required
                                disabled={isSubmitting}
                            >
                                {sensorMenuItems}
                            </Select>
                        </FormControl>

                        {triggerFields}

                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Operator</InputLabel>
                            <Select
                                value={formData.triggerOperator}
                                label="Operator"
                                onChange={handleTriggerOperatorChange}
                                disabled={isSubmitting}
                            >
                                <MenuItem value={RuleOperator.EQUALS}>EQUALS</MenuItem>
                                <MenuItem value={RuleOperator.GREATER_THAN}>GREATER_THAN</MenuItem>
                                <MenuItem value={RuleOperator.LESS_THAN}>LESS_THAN</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            label="Value"
                            value={formData.triggerValue}
                            onChange={handleTriggerValueChange}
                            required
                            disabled={isSubmitting}
                        />
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="subtitle1" gutterBottom>
                            THEN (Action)
                        </Typography>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Action Device</InputLabel>
                            <Select
                                value={formData.actionDeviceId}
                                label="Action Device"
                                onChange={handleActionDeviceChange}
                                required
                                disabled={isSubmitting}
                            >
                                {actionMenuItems}
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="New State (JSON)"
                            value={formData.actionNewState}
                            onChange={handleActionNewStateChange}
                            disabled={isSubmitting}
                        />
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        sx={{ mt: 2 }}
                        disabled={isSubmitting || !isFormValid}
                    >
                        {submitButtonContent}
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
}