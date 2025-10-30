import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import {Dashboard} from './views/Dashboard';
import { useWebSocket } from './hooks/useWebSocket';



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

function App() {
    const stompClient = useWebSocket();

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            {/* 3. Przekazujemy klienta do Dashboardu */}
            <Dashboard stompClient={stompClient} />
        </ThemeProvider>
    );
}



export default App;