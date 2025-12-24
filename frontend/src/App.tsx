import {CssBaseline, ThemeProvider} from '@mui/material';
import {Route, Routes} from 'react-router-dom';
import {useEffect} from 'react';
import {useWebSocketSubscription} from './contexts/WebSocketProvider';
import {MainLayout} from './views/MainLayout';
import {DashboardView} from './views/DashboardView';
import {DevicesView} from './views/DevicesView';
import {AutomationView} from './views/AutomationView';
import {useAppStore} from './stores/appStore';
import {darkTheme, lightTheme} from './theme';
import {GlobalSnackbar} from "./components/GlobalSnackbar.tsx";
import {LogsView} from './views/LogsView';
import type {Device} from './types';


function App() {
    const subscriptionManager = useWebSocketSubscription();
    const { addOrUpdateDevice, appendChartData } = useAppStore();


    const themeMode = useAppStore((state) => state.themeMode);
    const theme = themeMode === 'light' ? lightTheme : darkTheme;

    useEffect(() => {
        const subscription = subscriptionManager?.subscribe('/topic/devices', (message) => {
            try {
                const updatedDevice: Device = JSON.parse(message.body);
                addOrUpdateDevice(updatedDevice);
                appendChartData(updatedDevice);
            } catch (err) { console.error('Failed to parse device message:', err); }
        });
        return () => subscription?.unsubscribe();
    }, [subscriptionManager, addOrUpdateDevice, appendChartData]);

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