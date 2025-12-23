import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#9c27b0',
        },
        background: {
            default: '#f4f6f8',
            paper: '#ffffff',
        },
    },
    shape: {
        borderRadius: 3,
    },
});

export const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#60a5fa',
        },
        secondary: {
            main: '#a78bfa',
        },
        background: {
            default: '#0a0a0a',
            paper: '#161616',
        },
    },
    shape: {
        borderRadius: 3,
    },
});