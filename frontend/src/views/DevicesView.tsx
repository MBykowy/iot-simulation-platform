import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { Grid, Paper, Box, Typography, Fade, Grow } from '@mui/material';
import { DeviceCard } from '../components/DeviceCard';
import { DeviceHistoryModal } from '../components/DeviceHistoryModal';
import { SimulationConfigModal } from '../components/SimulationConfigModal';
import type { Device } from '../types';
import { Dns } from "@mui/icons-material";

export function DevicesView() {
    const devices = useAppStore((state) => state.devices);
    const fetchDevices = useAppStore((state) => state.fetchDevices);
    const removeDevice = useAppStore((state) => state.removeDevice);

    useEffect(() => {
        fetchDevices();
    }, [fetchDevices]);

    const [historyDevice, setHistoryDevice] = useState<Device | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [simulationDevice, setSimulationDevice] = useState<Device | null>(null);
    const [isSimModalOpen, setIsSimModalOpen] = useState(false);

    const handleHistoryClick = (device: Device) => {
        setHistoryDevice(device);
        setIsHistoryModalOpen(true);
    };

    const handleSimulateClick = (device: Device) => {
        setSimulationDevice(device);
        setIsSimModalOpen(true);
    };

    return (
        <>
            <Fade in timeout={800}>
                <Paper
                    elevation={0}
                    sx={{ p: 4, background: 'rgba(22, 22, 22, 0.6)', border: '1px solid rgba(96, 165, 250, 0.1)', borderRadius: 3 }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5 }}>
                        <Box sx={{ p: 1.5, borderRadius: 2, background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Dns sx={{ color: 'primary.main', fontSize: 28 }} />
                        </Box>
                        <Typography variant="h5" component="h2">Registered Devices</Typography>
                    </Box>

                    {devices.length > 0 ? (
                        <Grid container spacing={3}>
                            {devices.map((device, index) => (
                                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={device.id}>
                                    <Grow in timeout={300 + index * 100}>
                                        <Box>
                                            <DeviceCard
                                                device={device}
                                                // USUNIĘTO: onClick={() => {}} - to powodowało błąd
                                                onHistoryClick={() => handleHistoryClick(device)}
                                                onSimulateClick={() => handleSimulateClick(device)}
                                                onDelete={removeDevice}
                                            />
                                        </Box>
                                    </Grow>
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Box sx={{ py: 8, textAlign: 'center' }}>
                            <Typography variant="h6" color="text.secondary">No devices found</Typography>
                        </Box>
                    )}
                </Paper>
            </Fade>
            <DeviceHistoryModal device={historyDevice} open={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} />
            <SimulationConfigModal device={simulationDevice} open={isSimModalOpen} onClose={() => setIsSimModalOpen(false)} />
        </>
    );
}