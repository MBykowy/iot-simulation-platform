import { ThemeProvider, CssBaseline } from '@mui/material';
import { Routes, Route } from 'react-router-dom';
import { useWebSocket } from './hooks/useWebSocket';
import { MainLayout } from './views/MainLayout';
import { DashboardView } from './views/DashboardView';
import { DevicesView } from './views/DevicesView';
import { AutomationView } from './views/AutomationView';
import { useAppStore } from './stores/appStore';
import { lightTheme, darkTheme } from './theme';
import {GlobalSnackbar} from "./components/GlobalSnackbar.tsx";


function App() {
    useWebSocket();
    const themeMode = useAppStore((state) => state.themeMode);
    const theme = themeMode === 'light' ? lightTheme : darkTheme;

    return (
        <ThemeProvider theme={theme}> {/* dynamic theme */}
            <CssBaseline />
            <GlobalSnackbar />
            <Routes>
                <Route path="/" element={<MainLayout />}>
                    <Route index element={<DashboardView />} />
                    <Route path="devices" element={<DevicesView />} />
                    <Route path="automation" element={<AutomationView />} />
                </Route>
            </Routes>
        </ThemeProvider>
    );
}

export default App;