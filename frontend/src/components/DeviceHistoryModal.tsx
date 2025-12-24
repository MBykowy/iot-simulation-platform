import {
    Box,
    Button,
    ButtonGroup,
    CircularProgress,
    Modal,
    ToggleButton,
    ToggleButtonGroup,
    Typography
} from '@mui/material';
import {TableRows as TableRowsIcon, Timeline as TimelineIcon} from '@mui/icons-material';
import type {Device} from '../types';
import {RealTimeChart} from './RealTimeChart';
import {DataTableView} from './DataTableView';
import {useChart} from '../hooks/useChart';
import {useEffect} from "react";
import {useAppStore} from "../stores/appStore.tsx";

const style = {
    position: 'absolute' as 'absolute',
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

interface DeviceHistoryModalProps {
    device: Device | null;
    open: boolean;
    onClose: () => void;
    liveUpdateCallbackRef: React.MutableRefObject<((device: Device) => void) | null>;
}

interface DeviceHistoryModalProps {
    device: Device | null;
    open: boolean;
    onClose: () => void;
}

export function DeviceHistoryModal({ device, open, onClose }: DeviceHistoryModalProps) {
    const {
        chartData,
        isLoading,
        viewMode,
        setViewMode,
        selectedRange,
        handleRangeChange,
        appendDataPoint,
    } = useChart(open ? device?.id ?? null : null);

    const setLiveUpdateCallback = useAppStore((state) => state.setLiveUpdateCallback);

    useEffect(() => {
        if (open) {
            setLiveUpdateCallback(appendDataPoint);
        }

        return () => {
            setLiveUpdateCallback(null);
        };
    }, [open, appendDataPoint, setLiveUpdateCallback]);

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={style}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h6" component="h2">History for {device?.name}</Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <ToggleButtonGroup
                            value={viewMode}
                            exclusive
                            onChange={(_e, newMode) => { if (newMode) setViewMode(newMode); }}
                            size="small"
                        >
                            <ToggleButton value="chart" aria-label="chart view"><TimelineIcon /></ToggleButton>
                            <ToggleButton value="table" aria-label="table view"><TableRowsIcon /></ToggleButton>
                        </ToggleButtonGroup>
                        <ButtonGroup variant="outlined" size="small">
                            {timeRanges.map((range) => (
                                <Button
                                    key={range}
                                    variant={selectedRange === range ? 'contained' : 'outlined'}
                                    onClick={() => handleRangeChange(range)}
                                >
                                    {range}
                                </Button>
                            ))}
                        </ButtonGroup>
                    </Box>
                </Box>

                {isLoading ? (
                    <Box sx={{ height: 450, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress />
                    </Box>
                ) : chartData.length > 0 ? (
                    viewMode === 'chart'
                        ? <RealTimeChart chartData={chartData} selectedRange={selectedRange} />
                        : <DataTableView chartData={chartData} />
                ) : (
                    <Box sx={{ height: 450, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography color="text.secondary">
                            No data available for the selected time range.
                        </Typography>
                    </Box>
                )}
            </Box>
        </Modal>
    );
}