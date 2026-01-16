import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    ButtonGroup,
    CircularProgress,
    FormControlLabel,
    Modal,
    Switch,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    Tooltip
} from '@mui/material';
import { TableRows as TableRowsIcon, Timeline as TimelineIcon, WarningAmber as WarningIcon } from '@mui/icons-material';
import type { Device } from '../types';
import { RealTimeChart } from './RealTimeChart';
import { DataTableView } from './DataTableView';
import { useChart } from '../hooks/useChart';
import { useAppStore } from '../stores/appStore';

const modalPosition = 'absolute' as const;

const style = {
    position: modalPosition,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: 1200,
    bgcolor: 'background.paper',
    border: '1px solid rgba(96, 165, 250, 0.2)',
    boxShadow: 24,
    p: 4,
    borderRadius: 3,
};

const timeRanges = ['1m', '15m', '30m', '1h', '6h', '12h', '24h', '7d'];

interface TimeRangeButtonProps {
    readonly range: string;
    readonly selectedRange: string;
    readonly onRangeChange: (range: string) => void;
}

function TimeRangeButton({ range, selectedRange, onRangeChange }: TimeRangeButtonProps) {
    const handleClick = () => {
        onRangeChange(range);
    };

    return (
        <Button
            variant={selectedRange === range ? 'contained' : 'outlined'}
            onClick={handleClick}
        >
            {range}
        </Button>
    );
}

interface DeviceHistoryModalProps {
    readonly device: Device | null;
    readonly open: boolean;
    readonly onClose: () => void;
}

export function DeviceHistoryModal({ device, open, onClose }: DeviceHistoryModalProps) {
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');

    let chartDeviceId: string | null = null;
    if (open && device) {
        chartDeviceId = device.id;
    }

    const {
        chartData,
        totalPoints,
        isLoading,
        viewMode,
        setViewMode,
        selectedRange,
        isOptimized,
        setIsOptimized,
        handleRangeChange,
        appendDataPoint,
    } = useChart(chartDeviceId);

    const setLiveUpdateCallback = useAppStore((state) => state.setLiveUpdateCallback);

    useEffect(() => {
        if (open) {
            setLiveUpdateCallback(appendDataPoint);
        }
        return () => {
            setLiveUpdateCallback(null);
        };
    }, [open, appendDataPoint, setLiveUpdateCallback]);

    const handleCustomQuery = () => {
        if (startTime) {
            let query = startTime;
            if (endTime) {
                query += `&stop=${endTime}`;
            }
            handleRangeChange(query);
        }
    };

    const handleViewModeChange = (
        _event: React.MouseEvent<HTMLElement>,
        newMode: 'chart' | 'table' | null,
    ) => {
        if (newMode) {
            setViewMode(newMode);
        }
    };

    const handleDateChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            setter(new Date(e.target.value).toISOString());
        } else {
            setter('');
        }
    };

    const handleOptimizationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setIsOptimized(event.target.checked);
    };

    let content: React.ReactNode;
    if (isLoading) {
        content = (
            <Box sx={{ height: 450, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
            </Box>
        );
    } else if (chartData.length > 0) {
        if (viewMode === 'chart') {
            content = <RealTimeChart chartData={chartData} selectedRange={selectedRange} />;
        } else {
            content = <DataTableView chartData={chartData} />;
        }
    } else {
        content = (
            <Box sx={{ height: 450, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">
                    No data available for the selected time range.
                </Typography>
            </Box>
        );
    }

    const showWarning = !isOptimized && totalPoints > 2000;

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={style}>
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                    flexWrap: 'wrap',
                    gap: 2
                }}>
                    <Box>
                        <Typography variant="h6" component="h2" sx={{ mt: 1 }}>
                            History for {device?.name}
                        </Typography>

                        {/* Data Points Stats */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                Displaying {chartData.length} of {totalPoints} points
                            </Typography>

                            {/* Optimization Toggle */}
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={isOptimized}
                                        onChange={handleOptimizationChange}
                                        size="small"
                                        color="primary"
                                    />
                                }
                                label={<Typography variant="caption">Optimize</Typography>}
                                sx={{ ml: 1, mr: 0 }}
                            />

                            {showWarning && (
                                <Tooltip title="High point count may cause lag">
                                    <WarningIcon color="warning" fontSize="small" />
                                </Tooltip>
                            )}
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <ToggleButtonGroup
                                value={viewMode}
                                exclusive
                                onChange={handleViewModeChange}
                                size="small"
                            >
                                <ToggleButton value="chart" aria-label="chart view">
                                    <TimelineIcon />
                                </ToggleButton>
                                <ToggleButton value="table" aria-label="table view">
                                    <TableRowsIcon />
                                </ToggleButton>
                            </ToggleButtonGroup>
                            <ButtonGroup variant="outlined" size="small">
                                {timeRanges.map((range) => (
                                    <TimeRangeButton
                                        key={range}
                                        range={range}
                                        selectedRange={selectedRange}
                                        onRangeChange={handleRangeChange}
                                    />
                                ))}
                            </ButtonGroup>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField
                                label="Start"
                                type="datetime-local"
                                size="small"
                                InputLabelProps={{ shrink: true }}
                                onChange={handleDateChange(setStartTime)}
                            />
                            <TextField
                                label="End"
                                type="datetime-local"
                                size="small"
                                InputLabelProps={{ shrink: true }}
                                onChange={handleDateChange(setEndTime)}
                            />
                            <Button onClick={handleCustomQuery} variant="contained" size="small">
                                Filter
                            </Button>
                        </Box>
                    </Box>
                </Box>
                {content}
            </Box>
        </Modal>
    );
}