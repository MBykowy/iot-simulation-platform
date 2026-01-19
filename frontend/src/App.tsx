import { Box, CircularProgress, CssBaseline, ThemeProvider, Typography } from '@mui/material';
import { Route, Routes } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useWebSocketSubscription } from './contexts/WebSocketProvider';
import { MainLayout } from './views/MainLayout';
import { DashboardView } from './views/DashboardView';
import { DevicesView } from './views/DevicesView';
import { AutomationView } from './views/AutomationView';
import { useAppStore } from './stores/appStore';
import { darkTheme, lightTheme } from './theme';
import { GlobalSnackbar } from './components/GlobalSnackbar';
import { LogsView } from './views/LogsView';
import { ApiEndpoint, type Device } from './types';

const STORE_FLUSH_INTERVAL_MS = 100;

function App() {
    const subscriptionManager = useWebSocketSubscription();
    const { updateDevicesBatch, appendChartData } = useAppStore();
    const [isSystemReady, setIsSystemReady] = useState(false);

    // buffer MQTT
    const pendingDeviceUpdates = useRef<Map<string, Device>>(new Map());

    const themeMode = useAppStore((state) => state.themeMode);

    let theme;
    if (themeMode === 'light') {
        theme = lightTheme;
    } else {
        theme = darkTheme;
    }

    // incoming data handler
    useEffect(() => {
        const subscription = subscriptionManager?.subscribe('/topic/devices', (message) => {
            if (!message.body) {
                return;
            }
            try {
                const updatedDevice: Device = JSON.parse(message.body);
                // bypass store for performance
                appendChartData(updatedDevice);
                pendingDeviceUpdates.current.set(updatedDevice.id, updatedDevice);
            } catch {
                // ignore parsing errors
            }
        });
        return () => {
            subscription?.unsubscribe();
        };
    }, [subscriptionManager, appendChartData]);

    // batch flusher
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (pendingDeviceUpdates.current.size > 0) {
                const updates = Array.from(pendingDeviceUpdates.current.values());
                pendingDeviceUpdates.current.clear();
                updateDevicesBatch(updates);
            }
        }, STORE_FLUSH_INTERVAL_MS);

        return () => {
            clearInterval(intervalId);
        };
    }, [updateDevicesBatch]);

    // health check
    useEffect(() => {
        let isMounted = true;
        const checkHealth = async () => {
            try {
                const res = await fetch(ApiEndpoint.HEALTH);
                if (res.ok) {
                    if (isMounted) {
                        setIsSystemReady(true);
                    }
                } else {
                    if (isMounted) {
                        setTimeout(() => {
                            void checkHealth();
                        }, 1000);
                    }
                }
            } catch {
                if (isMounted) {
                    setTimeout(() => {
                        void checkHealth();
                    }, 1000);
                }
            }
        };
        void checkHealth();
        return () => { isMounted = false; };
    }, []);

    if (!isSystemReady) {
        return (
            <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#121212', color: 'white' }}>
                <CircularProgress color="secondary" />
                <Typography variant="h6" sx={{ mt: 2 }}>Booting IoT Platform...</Typography>
                <Typography variant="caption" color="gray">Waiting for Backend Services</Typography>
            </Box>
        );
    }

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <GlobalSnackbar />
            <Routes>
                <Route path="/" element={<MainLayout />}>
                    <Route index element={<DashboardView />} />
                    <Route path="devices" element={<DevicesView />} />
                    <Route path="automation" element={<AutomationView />} />
                    <Route path="logs" element={<LogsView />} />
                </Route>
            </Routes>
        </ThemeProvider>
    );
}

export default App;