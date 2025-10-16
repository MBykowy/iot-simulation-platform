// frontend/src/App.tsx
import { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { DeviceCard } from './components/DeviceCard';
import type {Device} from './types';
import { ThemeProvider, createTheme, CssBaseline, Container, Typography, Box, Grid } from '@mui/material';
import {AddDeviceForm} from "./components/AddDeviceForm";
import {EventSimulatorForm} from "./components/EventSimulatorForm";

// Definiujemy ciemny motyw dla naszej aplikacji
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
    },
});

const API_URL = 'http://localhost:8081';
const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws';

function App() {
    const [devices, setDevices] = useState<Device[]>([]);
    const clientRef = useRef<Client | null>(null);


    useEffect(() => {
        fetch(`${API_URL}/api/devices`)
            .then(response => response.json())
            .then(data => {
                setDevices(Array.isArray(data) ? data : [data]);
            })
            .catch(error => console.error('Error fetching initial devices:', error));
    }, []);

    useEffect(() => {
        if (!clientRef.current) {
            console.log("Creating new STOMP client instance.");
            const client = new Client({
                brokerURL: WS_URL,
                debug: (str) => {
                    console.log('STOMP: ' + str);
                },
                reconnectDelay: 5000,
            });

            client.onConnect = () => {
                console.log('>>> SUCCESS: Connected to WebSocket!');
                client.subscribe('/topic/devices', (message: any) => {
                    try {
                        const updatedDevice: Device = JSON.parse(message.body);

                        setDevices(prevDevices => {
                            // Zabezpieczenie: upewniamy się, że pracujemy na tablicy
                            const prevArr = Array.isArray(prevDevices) ? prevDevices : [];

                            const existing = prevArr.find(d => d.id === updatedDevice.id);
                            if (existing) {
                                return prevArr.map(d => d.id === updatedDevice.id ? updatedDevice : d);
                            }
                            return [...prevArr, updatedDevice];
                        });
                    } catch (err) {
                        console.error('Failed to parse STOMP message body:', err);
                    }
                });
            };

            client.onStompError = (frame) => {
                console.error('Broker reported error:', frame.headers?.message || frame);
            };

            clientRef.current = client;
        }


        if (clientRef.current.active) {
            console.log("Client is already active.");
        } else {
            console.log("Activating STOMP client...");
            clientRef.current.activate();
        }

        return () => {
            console.log("Deactivating STOMP client on component unmount.");
            if (clientRef.current?.active) {
                clientRef.current.deactivate();
            }
        };
    }, []);



    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    IoT Simulation Platform
                </Typography>

                {/* Kontener na formularze ułożone w siatce */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid xs={12} md={6}>
                        <AddDeviceForm />
                    </Grid>
                    <Grid xs={12} md={6}>
                        <EventSimulatorForm devices={devices} />
                    </Grid>
                </Grid>

                <Box>
                    <Typography variant="h5" component="h2" gutterBottom>
                        Registered Devices (Live)
                    </Typography>
                    {devices.length > 0 ? (
                        <Grid container spacing={3}>
                            {devices.map(device => (
                                <Grid xs={12} sm={6} md={4} key={device.id}>
                                    <DeviceCard device={device} />
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Typography color="text.secondary" sx={{ mt: 2 }}>
                            No devices found. Use the form above to add a virtual device.
                        </Typography>
                    )}
                </Box>
            </Container>
        </ThemeProvider>
    );
}

export default App;
