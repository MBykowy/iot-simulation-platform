// src/components/DeviceHistoryModal.tsx
import { useEffect } from 'react';
import { Modal, Box, Typography, CircularProgress } from '@mui/material';
import type {Device} from '../types';
import { useAppStore } from '../stores/appStore';
import { RealTimeChart } from './RealTimeChart';

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    maxWidth: 900,
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

export function DeviceHistoryModal({ device, open, onClose }: DeviceHistoryModalProps) {
    const { isChartLoading, loadChartData, clearChartData, setActiveChartDevice } = useAppStore();

    useEffect(() => {
        if (open && device) {
            setActiveChartDevice(device.id);
            loadChartData(device.id, '1h');
        }

        return () => {
            if (!open) {
                clearChartData();
            }
        };
    }, [open, device, loadChartData, clearChartData, setActiveChartDevice]);

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={style}>
                <Typography variant="h6" component="h2">
                    History for {device?.name}
                </Typography>

                {isChartLoading ? (
                    <CircularProgress sx={{ mt: 4, display: 'block', mx: 'auto' }} />
                ) : (
                    <RealTimeChart />
                )}
            </Box>
        </Modal>
    );
}