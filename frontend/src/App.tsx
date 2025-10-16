// frontend/src/App.tsx
import { useState, useEffect, useRef } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import {
    ThemeProvider,
    createTheme,
    CssBaseline,
    Container,
    Typography,
    Box,
    Grid,
    AppBar,
    Toolbar,
    Paper,
    Divider,
    Fade,
    Grow
} from '@mui/material';
import { Dns, DeveloperBoard, Tune } from '@mui/icons-material';
import { DeviceCard } from './components/DeviceCard';
import { AddDeviceForm } from "./components/AddDeviceForm";
import { EventSimulatorForm } from "./components/EventSimulatorForm";
import type { Device } from './types';

// Premium dark theme with modern aesthetics
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#60a5fa',
            light: '#93c5fd',
            dark: '#3b82f6',
        },
        secondary: {
            main: '#a78bfa',
        },
        background: {
            default: '#0a0a0a',
            paper: '#161616',
        },
        text: {
            primary: '#f5f5f5',
            secondary: '#a3a3a3',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h4: {
            fontWeight: 700,
            letterSpacing: '-0.02em',
        },
        h5: {
            fontWeight: 600,
            letterSpacing: '-0.01em',
        },
        h6: {
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 12,
    },
    shadows: [
        'none',
        '0px 2px 4px rgba(0,0,0,0.2)',
        '0px 4px 8px rgba(0,0,0,0.3)',
        '0px 8px 16px rgba(0,0,0,0.4)',
        '0px 12px 24px rgba(0,0,0,0.5)',
        ...Array(20).fill('0px 16px 32px rgba(0,0,0,0.6)'),
    ] as any,
});

// Configuration for API and WebSocket endpoints
const API_URL = 'http://localhost:8081';
const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws';

function App() {
    const [devices, setDevices] = useState<Device[]>([]);
    const clientRef = useRef<Client | null>(null);

    // Fetch initial device data on mount
    useEffect(() => {
        const fetchInitialDevices = async () => {
            try {
                const response = await fetch(`${API_URL}/api/devices`);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const data = await response.json();
                setDevices(Array.isArray(data) ? data : [data]);
            } catch (error) {
                console.error('Error fetching initial devices:', error);
            }
        };

        fetchInitialDevices();
    }, []);

    // Manage WebSocket (STOMP) client lifecycle
    useEffect(() => {
        if (!clientRef.current) {
            console.log("Initializing STOMP client...");
            const client = new Client({
                brokerURL: WS_URL,
                debug: (str) => console.log('STOMP: ' + str),
                reconnectDelay: 5000,
            });

            client.onConnect = () => {
                console.log('>>> SUCCESS: Connected to WebSocket!');
                client.subscribe('/topic/devices', (message: IMessage) => {
                    try {
                        const updatedDevice: Device = JSON.parse(message.body);
                        setDevices(prevDevices => {
                            const currentDevices = Array.isArray(prevDevices) ? prevDevices : [];
                            const deviceIndex = currentDevices.findIndex(d => d.id === updatedDevice.id);
                            if (deviceIndex > -1) {
                                const newDevices = [...currentDevices];
                                newDevices[deviceIndex] = updatedDevice;
                                return newDevices;
                            } else {
                                return [...currentDevices, updatedDevice];
                            }
                        });
                    } catch (err) {
                        console.error('Failed to parse STOMP message body:', err);
                    }
                });
            };

            client.onStompError = (frame) => {
                console.error('Broker reported error:', frame.headers?.message, 'Details:', frame.body);
            };

            clientRef.current = client;
        }

        const client = clientRef.current;
        if (!client.active) {
            console.log("Activating STOMP client...");
            client.activate();
        }

        return () => {
            if (client?.active) {
                console.log("Deactivating STOMP client on component unmount.");
                client.deactivate();
            }
        };
    }, []);

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)' }}>
                {/* Premium App Bar */}
                <AppBar
                    position="fixed"
                    elevation={0}
                    sx={{
                        zIndex: (theme) => theme.zIndex.drawer + 1,
                        background: 'rgba(22, 22, 22, 0.8)',
                        backdropFilter: 'blur(20px)',
                        borderBottom: '1px solid rgba(96, 165, 250, 0.1)',
                    }}
                >
                    <Toolbar sx={{ py: 1 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            <DeveloperBoard sx={{ fontSize: 32, color: '#60a5fa' }} />
                            <Typography
                                variant="h6"
                                component="div"
                                sx={{
                                    fontWeight: 700,
                                    letterSpacing: '-0.02em',
                                    background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                IoT Simulation Platform
                            </Typography>
                        </Box>
                    </Toolbar>
                </AppBar>

                {/* Main Content */}
                <Container maxWidth="lg" sx={{ pt: 12, pb: 6, mx: 'auto' }}>
                    {/* Control Panel Section */}
                    <Fade in timeout={600}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 4,
                                mb: 5,
                                background: 'rgba(22, 22, 22, 0.6)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(96, 165, 250, 0.1)',
                                borderRadius: 3,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    borderColor: 'rgba(96, 165, 250, 0.3)',
                                    boxShadow: '0 8px 32px rgba(96, 165, 250, 0.1)',
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5 }}>
                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Tune sx={{ color: 'primary.main', fontSize: 28 }} />
                                </Box>
                                <Typography
                                    variant="h5"
                                    component="h1"
                                    sx={{
                                        background: 'linear-gradient(135deg, #f5f5f5 0%, #a3a3a3 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                >
                                    Control Panel
                                </Typography>
                            </Box>

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <AddDeviceForm />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <EventSimulatorForm devices={devices} />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Fade>

                    {/* Elegant Divider */}
                    <Box sx={{ display: 'flex', alignItems: 'center', my: 5 }}>
                        <Divider
                            sx={{
                                flex: 1,
                                borderColor: 'rgba(96, 165, 250, 0.1)',
                                borderWidth: 1,
                            }}
                        />
                        <Box
                            sx={{
                                mx: 2,
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                            }}
                        />
                        <Divider
                            sx={{
                                flex: 1,
                                borderColor: 'rgba(96, 165, 250, 0.1)',
                                borderWidth: 1,
                            }}
                        />
                    </Box>

                    {/* Live Devices Section */}
                    <Fade in timeout={800}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 4,
                                background: 'rgba(22, 22, 22, 0.6)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(96, 165, 250, 0.1)',
                                borderRadius: 3,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    borderColor: 'rgba(96, 165, 250, 0.3)',
                                    boxShadow: '0 8px 32px rgba(96, 165, 250, 0.1)',
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5 }}>
                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Dns sx={{ color: 'primary.main', fontSize: 28 }} />
                                </Box>
                                <Typography
                                    variant="h5"
                                    component="h2"
                                    sx={{
                                        background: 'linear-gradient(135deg, #f5f5f5 0%, #a3a3a3 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                >
                                    Registered Devices
                                </Typography>
                                <Box
                                    sx={{
                                        ml: 2,
                                        px: 2,
                                        py: 0.5,
                                        borderRadius: 2,
                                        background: 'rgba(34, 197, 94, 0.1)',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            bgcolor: '#22c55e',
                                            animation: 'pulse 2s ease-in-out infinite',
                                            '@keyframes pulse': {
                                                '0%, 100%': { opacity: 1 },
                                                '50%': { opacity: 0.4 },
                                            },
                                        }}
                                    />
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: '#22c55e',
                                            fontWeight: 600,
                                            fontSize: '0.75rem',
                                        }}
                                    >
                                        LIVE
                                    </Typography>
                                </Box>
                            </Box>

                            {devices.length > 0 ? (
                                <Grid container spacing={3}>
                                    {devices.map((device, index) => (
                                        <Grid item xs={12} sm={6} md={4} key={device.id}>
                                            <Grow in timeout={300 + index * 100}>
                                                <Box>
                                                    <DeviceCard device={device} />
                                                </Box>
                                            </Grow>
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : (
                                <Box
                                    sx={{
                                        py: 8,
                                        textAlign: 'center',
                                        borderRadius: 2,
                                        border: '2px dashed rgba(96, 165, 250, 0.2)',
                                        background: 'rgba(96, 165, 250, 0.02)',
                                    }}
                                >
                                    <Dns sx={{ fontSize: 64, color: 'rgba(96, 165, 250, 0.3)', mb: 2 }} />
                                    <Typography
                                        variant="h6"
                                        color="text.secondary"
                                        sx={{ mb: 1, fontWeight: 500 }}
                                    >
                                        No devices found
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Use the control panel above to add your first virtual device
                                    </Typography>
                                </Box>
                            )}
                        </Paper>
                    </Fade>
                </Container>
            </Box>
        </ThemeProvider>
    );
}

export default App;