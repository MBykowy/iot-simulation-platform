import {useEffect} from 'react';
import {
    Box,
    Button,
    ButtonGroup,
    CircularProgress,
    Modal,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import {TableRows as TableRowsIcon, Timeline as TimelineIcon} from '@mui/icons-material';
import type {Device} from '../types';
import {RealTimeChart} from './RealTimeChart';
import {DataTableView} from './DataTableView';
import {useChart} from '../hooks/useChart';
import {useAppStore} from '../stores/appStore';

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

function TimeRangeButton({range, selectedRange, onRangeChange}: TimeRangeButtonProps) {
    const handleClick = () => {
        onRangeChange(range);
    };

    let variant: 'contained' | 'outlined';
    if (selectedRange === range) {
        variant = 'contained';
    } else {
        variant = 'outlined';
    }

    return (
        <Button variant={variant} onClick={handleClick}>
            {range}
        </Button>
    );
}


interface DeviceHistoryModalProps {
    readonly device: Device | null;
    readonly open: boolean;
    readonly onClose: () => void;
}

export function DeviceHistoryModal({device, open, onClose}: DeviceHistoryModalProps) {
    // Removing ternary operator
    let chartDeviceId: string | null = null;
    if (open && device) {
        chartDeviceId = device.id;
    }

    const {
        chartData,
        isLoading,
        viewMode,
        setViewMode,
        selectedRange,
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

    const handleViewModeChange = (
        _event: React.MouseEvent<HTMLElement>,
        newMode: 'chart' | 'table' | null,
    ) => {
        if (newMode) {
            setViewMode(newMode);
        }
    };

    let content: React.ReactNode;
    if (isLoading) {
        content = (
            <Box sx={{height: 450, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <CircularProgress/>
            </Box>
        );
    } else if (chartData.length > 0) {
        if (viewMode === 'chart') {
            content = <RealTimeChart chartData={chartData} selectedRange={selectedRange}/>;
        } else {
            content = <DataTableView chartData={chartData}/>;
        }
    } else {
        content = (
            <Box sx={{height: 450, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Typography color="text.secondary">
                    No data available for the selected time range.
                </Typography>
            </Box>
        );
    }

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={style}>
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                    flexWrap: 'wrap',
                    gap: 2
                }}>
                    <Typography variant="h6" component="h2">
                        History for {device?.name}
                    </Typography>
                    <Box sx={{display: 'flex', gap: 2, alignItems: 'center'}}>
                        <ToggleButtonGroup
                            value={viewMode}
                            exclusive
                            onChange={handleViewModeChange}
                            size="small"
                        >
                            <ToggleButton value="chart" aria-label="chart view">
                                <TimelineIcon/>
                            </ToggleButton>
                            <ToggleButton value="table" aria-label="table view">
                                <TableRowsIcon/>
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
                </Box>
                {content}
            </Box>
        </Modal>
    );
}