import { useEffect, useState, useCallback, type ChangeEvent, type MouseEvent, type ReactNode } from 'react';
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
    Tooltip,
} from '@mui/material';
import { TableRows as TableRowsIcon, Timeline as TimelineIcon, WarningAmber as WarningIcon } from '@mui/icons-material';
import type { Device } from '../types';
import { RealTimeChart } from './RealTimeChart';
import { DataTableView } from './DataTableView';
import { useChart } from '../hooks/useChart';
import { useAppStore } from '../stores/appStore';

const WARNING_POINT_THRESHOLD = 2000;
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
    const handleClick = useCallback(() => {
        onRangeChange(range);
    }, [range, onRangeChange]);

    let buttonVariant: 'contained' | 'outlined';
    if (selectedRange === range) {
        buttonVariant = 'contained';
    } else {
        buttonVariant = 'outlined';
    }

    return (
        <Button
            variant={buttonVariant}
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

    const handleCustomQuery = useCallback(() => {
        if (startTime) {
            let query = startTime;
            if (endTime) {
                query += `&stop=${endTime}`;
            }
            handleRangeChange(query);
        }
    }, [startTime, endTime, handleRangeChange]);

    const handleViewModeChange = useCallback((
        _event: MouseEvent<HTMLElement>,
        newMode: 'chart' | 'table' | null,
    ) => {
        if (newMode) {
            setViewMode(newMode);
        }
    }, [setViewMode]);

    const handleStartTimeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.value) {
            setStartTime(new Date(event.target.value).toISOString());
        } else {
            setStartTime('');
        }
    }, []);

    const handleEndTimeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.value) {
            setEndTime(new Date(event.target.value).toISOString());
        } else {
            setEndTime('');
        }
    }, []);

    const handleOptimizationChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setIsOptimized(event.target.checked);
    }, [setIsOptimized]);

    let content: ReactNode;
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
                <Typography color='text.secondary'>
                    No data available for the selected time range.
                </Typography>
            </Box>
        );
    }

    const showWarning = !isOptimized && totalPoints > WARNING_POINT_THRESHOLD;

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={style}>
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                    flexWrap: 'wrap',
                    gap: 2,
                }}>
                    <Box>
                        <Typography variant='h6' component='h2' sx={{ mt: 1 }}>
                            History for {device?.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Typography variant='caption' color='text.secondary'>
                                Displaying {chartData.length} of {totalPoints} points
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={isOptimized}
                                        onChange={handleOptimizationChange}
                                        size='small'
                                        color='primary'
                                    />
                                }
                                label={<Typography variant='caption'>Optimize</Typography>}
                                sx={{ ml: 1, mr: 0 }}
                            />
                            {showWarning && (
                                <Tooltip title='High point count may cause lag'>
                                    <WarningIcon color='warning' fontSize='small' />
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
                                size='small'
                            >
                                <ToggleButton value='chart' aria-label='chart view'>
                                    <TimelineIcon />
                                </ToggleButton>
                                <ToggleButton value='table' aria-label='table view'>
                                    <TableRowsIcon />
                                </ToggleButton>
                            </ToggleButtonGroup>
                            <ButtonGroup variant='outlined' size='small'>
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
                                label='Start'
                                type='datetime-local'
                                size='small'
                                onChange={handleStartTimeChange}
                            />
                            <TextField
                                label='End'
                                type='datetime-local'
                                size='small'
                                onChange={handleEndTimeChange}
                            />
                            <Button onClick={handleCustomQuery} variant='contained' size='small'>
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