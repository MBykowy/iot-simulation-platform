import { useState, useEffect } from 'react';
import { Modal, Box, Typography, CircularProgress, ToggleButtonGroup, ToggleButton } from '@mui/material';
import type {Device} from '../types';
import { useChartStore } from '../stores/chartStore';
import { RealTimeChart } from './RealTimeChart';
import { Client } from '@stomp/stompjs';


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
    stompClient: Client | null;
}



export function DeviceHistoryModal({ device, open, onClose, stompClient }: DeviceHistoryModalProps) {
    const { data, isLoading, loadInitialData, addDataPoint, clearData } = useChartStore();
    const [chartType, setChartType] = useState<'smooth' | 'points'>('smooth');

    useEffect(() => {
        let subscription: any = null;

        if (open && device && stompClient?.active) {

            loadInitialData(device.id, '1h');


            subscription = stompClient.subscribe('/topic/devices', (message) => {
                const updatedDevice: Device = JSON.parse(message.body);
                if (updatedDevice.id === device.id) {
                    addDataPoint(device.id, updatedDevice);
                }
            });
        }


        return () => {
            if (subscription) {
                subscription.unsubscribe();
            }
            if (!open) {
                clearData();
            }
        };
    }, [open, device, stompClient, loadInitialData, addDataPoint, clearData]);

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={style}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" component="h2">
                        History for {device?.name}
                    </Typography>
                    <ToggleButtonGroup
                        value={chartType}
                        exclusive
                        onChange={(_, newType) => newType && setChartType(newType)}
                        size="small"
                    >
                        <ToggleButton value="smooth">Smooth Line</ToggleButton>
                        <ToggleButton value="points">Points</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {isLoading ? (
                    <CircularProgress sx={{ mt: 4, display: 'block', mx: 'auto' }} />
                ) : (
                    <RealTimeChart data={data} type={chartType} />
                )}
            </Box>
        </Modal>
    );
}