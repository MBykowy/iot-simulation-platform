import { useEffect, useState } from 'react';
import {
    Box,
    CircularProgress,
    Container,
    Fade,
    Grid,
    Grow,
    Paper,
    Typography,
} from '@mui/material';
import { Dns } from '@mui/icons-material';
import { useAppStore } from '../stores/appStore';
import { DeviceCard } from '../components/DeviceCard';
import { DeviceHistoryModal } from '../components/DeviceHistoryModal';
import { SimulationConfigModal } from '../components/SimulationConfigModal';
import { DeviceCommandModal } from '../components/DeviceCommandModal';
import type { Device } from '../types';

interface DeviceGridItemProps {
    readonly device: Device;
    readonly index: number;
    readonly onHistoryClick: (device: Device) => void;
    readonly onSimulateClick: (device: Device) => void;
    readonly onCommandClick: (device: Device) => void;
}

function DeviceGridItem({
                            device,
                            index,
                            onHistoryClick,
                            onSimulateClick,
                            onCommandClick,
                        }: DeviceGridItemProps) {
    const handleHistoryClick = () => {
        onHistoryClick(device);
    };

    const handleSimulateClick = () => {
        onSimulateClick(device);
    };

    const handleCommandClick = () => {
        onCommandClick(device);
    };

    return (
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Grow in timeout={300 + index * 100}>
                <Box>
                    <DeviceCard
                        device={device}
                        onHistoryClick={handleHistoryClick}
                        onSimulateClick={handleSimulateClick}
                        onCommandClick={handleCommandClick}
                    />
                </Box>
            </Grow>
        </Grid>
    );
}

export function DevicesView() {
    const [isLoading, setIsLoading] = useState(true);
    const devices = useAppStore((state) => state.devices);
    const fetchDevices = useAppStore((state) => state.fetchDevices);

    // Modal States
    const [historyDevice, setHistoryDevice] = useState<Device | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const [simulationDevice, setSimulationDevice] = useState<Device | null>(null);
    const [isSimModalOpen, setIsSimModalOpen] = useState(false);

    const [commandDevice, setCommandDevice] = useState<Device | null>(null);
    const [isCommandModalOpen, setIsCommandModalOpen] = useState(false);

    useEffect(() => {
        const loadDevices = async () => {
            setIsLoading(true);
            try {
                await fetchDevices();
            } catch {
                // Handled by store/apiClient
            } finally {
                setIsLoading(false);
            }
        };

        void loadDevices();
    }, [fetchDevices]);

    // Handlers
    const handleHistoryClick = (device: Device) => {
        setHistoryDevice(device);
        setIsHistoryModalOpen(true);
    };

    const handleSimulateClick = (device: Device) => {
        setSimulationDevice(device);
        setIsSimModalOpen(true);
    };

    const handleCommandClick = (device: Device) => {
        setCommandDevice(device);
        setIsCommandModalOpen(true);
    };

    const handleCloseHistoryModal = () => {
        setIsHistoryModalOpen(false);
    };

    const handleCloseSimModal = () => {
        setIsSimModalOpen(false);
    };

    const handleCloseCommandModal = () => {
        setIsCommandModalOpen(false);
    };

    let content: React.ReactNode;

    if (isLoading) {
        content = (
            <Box sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress />
            </Box>
        );
    } else if (devices.length > 0) {
        content = (
            <Grid container spacing={3}>
                {devices.map((device, index) => (
                    <DeviceGridItem
                        key={device.id}
                        device={device}
                        index={index}
                        onHistoryClick={handleHistoryClick}
                        onSimulateClick={handleSimulateClick}
                        onCommandClick={handleCommandClick}
                    />
                ))}
            </Grid>
        );
    } else {
        content = (
            <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                    No devices found.
                </Typography>
                <Typography color="text.secondary">
                    You can create a virtual device from the Dashboard.
                </Typography>
            </Box>
        );
    }

    return (
        <Container maxWidth="xl">
            <Fade in timeout={800}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 4,
                        background: 'rgba(22, 22, 22, 0.6)',
                        border: '1px solid rgba(96, 165, 250, 0.1)',
                        borderRadius: 3,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5 }}>
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                background:
                                    'linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Dns sx={{ color: 'primary.main', fontSize: 28 }} />
                        </Box>
                        <Typography variant="h5" component="h2">
                            Registered Devices
                        </Typography>
                    </Box>

                    {content}
                </Paper>
            </Fade>

            <DeviceHistoryModal
                device={historyDevice}
                open={isHistoryModalOpen}
                onClose={handleCloseHistoryModal}
            />

            <SimulationConfigModal
                device={simulationDevice}
                open={isSimModalOpen}
                onClose={handleCloseSimModal}
            />

            <DeviceCommandModal
                device={commandDevice}
                open={isCommandModalOpen}
                onClose={handleCloseCommandModal}
            />
        </Container>
    );
}