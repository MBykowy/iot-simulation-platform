import { Box, CircularProgress, CssBaseline, ThemeProvider, Typography } from '@mui/material';
import { Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useWebSocketSubscription } from './contexts/WebSocketProvider';
import { MainLayout } from './views/MainLayout';
import { DashboardView } from './views/DashboardView';
import { DevicesView } from './views/DevicesView';
import { AutomationView } from './views/AutomationView';
import { useAppStore } from './stores/appStore';
import { darkTheme, lightTheme } from './theme';
import { GlobalSnackbar } from './components/GlobalSnackbar';
import { LogsView } from './views/LogsView';
import type { Device } from './types';

function App() {
    const subscriptionManager = useWebSocketSubscription();
    const { addOrUpdateDevice, appendChartData } = useAppStore();
    const [isSystemReady, setIsSystemReady] = useState(false);

    const themeMode = useAppStore((state) => state.themeMode);

    let theme = darkTheme;
    if (themeMode === 'light') {
        theme = lightTheme;
    }

    useEffect(() => {
        const subscription = subscriptionManager?.subscribe('/topic/devices', (message) => {
            try {
                const updatedDevice: Device = JSON.parse(message.body);
                addOrUpdateDevice(updatedDevice);
                appendChartData(updatedDevice);
            } catch (error) {
                console.info('Failed to parse device update payload:', error);
            }
        });
        return () => subscription?.unsubscribe();
    }, [subscriptionManager, addOrUpdateDevice, appendChartData]);

    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await fetch('/api/health');
                if (res.ok) {
                    setIsSystemReady(true);
                } else {
                    setTimeout(() => void checkHealth().catch((e) => console.info(e)), 1000);
                }
            } catch (error) {
                console.info('Health check failed:', error);
                setTimeout(() => void checkHealth().catch((e) => console.info(e)), 1000);
            }
        };

        void checkHealth().catch((e) => console.info(e));
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