import { useEffect, useState } from 'react';
import {
    Modal,
    Box,
    Typography,
    CircularProgress,
    Button,
    ButtonGroup,
    ToggleButtonGroup,
    ToggleButton
} from '@mui/material';
import { Timeline as TimelineIcon, TableRows as TableRowsIcon } from '@mui/icons-material';
import type {Device} from '../types';
import { useAppStore } from '../stores/appStore';
import { RealTimeChart } from './RealTimeChart';
import { DataTableView } from './DataTableView';

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

interface DeviceHistoryModalProps {
    device: Device | null;
    open: boolean;
    onClose: () => void;
}

const timeRanges = ['1m', '15m', '30m', '1h', '6h', '12h', '24h', '7d'];

export function DeviceHistoryModal({ device, open, onClose }: DeviceHistoryModalProps) {
    const {
        isChartLoading,
        loadChartData,
        clearChartData,
        setActiveChartDevice,
        selectedRange
    } = useAppStore();

    const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

    useEffect(() => {
        if (open && device) {
            setActiveChartDevice(device.id);
            loadChartData(device.id, selectedRange);
        }

        return () => {
            if (!open) {
                clearChartData();
                setViewMode('chart');
            }
        };
    }, [open, device]);

    const handleRangeChange = (range: string) => {
        if (device) {
            loadChartData(device.id, range);
        }
    };
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

                {isChartLoading ? (
                    <Box sx={{ height: 450, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    viewMode === 'chart' ? <RealTimeChart /> : <DataTableView />
                )}
            </Box>
        </Modal>
    );
}