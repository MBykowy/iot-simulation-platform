import {create} from 'zustand';
import type {Device} from '../types';

const API_URL = '';

export interface ChartDataPoint {
    time: number;
    [key: string]: number | string;
}

type SnackbarSeverity = 'success' | 'error' | 'info' | 'warning';

interface SnackbarState {
    open: boolean;
    message: string;
    severity: SnackbarSeverity;
}


export interface AppState {
    //urządzenia
    devices: Device[];
    fetchDevices: () => Promise<void>;
    addOrUpdateDevice: (device: Device) => void;
    removeDevice: (deviceId: string) => void;
    //wykres

    chartData: ChartDataPoint[];
    isChartLoading: boolean;
    activeChartDeviceId: string | null;
    setActiveChartDevice: (deviceId: string | null) => void;
    appendChartData: (device: Device) => void;
    clearChartData: () => void;
    selectedRange: string;
    setChartData: (data: ChartDataPoint[]) => void;
    liveUpdateCallback: ((device: Device) => void) | null;
    setLiveUpdateCallback: (callback: ((device: Device) => void) | null) => void;

    //motyw
    themeMode: 'light' | 'dark';
    toggleThemeMode: () => void;
    //Snakbar
    snackbar: SnackbarState;
    showSnackbar: (message: string, severity: SnackbarSeverity) => void;
    hideSnackbar: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
    // urządzenia
    devices: [],
    selectedRange: '15m',
    liveUpdateCallback: null,
    setLiveUpdateCallback: (callback) => set({ liveUpdateCallback: callback }),

    setChartData: (data) => set({ chartData: data }),

    fetchDevices: async () => {
        try {
            const response = await fetch(`${API_URL}/api/devices`);
            if (!response.ok) throw new Error('Failed to fetch devices');
            const data = await response.json();
            set({ devices: Array.isArray(data) ? data : [] });
        } catch (error) { console.error('Error fetching devices:', error); }
    },

    addOrUpdateDevice: (device) => set((state) => {
        const index = state.devices.findIndex(d => d.id === device.id);
        if (index > -1) {
            const newDevices = [...state.devices];
            newDevices[index] = device;
            return { devices: newDevices };
        } else {
            return { devices: [...state.devices, device] };
        }
    }),

    removeDevice: (deviceId) => set((state) => ({
        devices: state.devices.filter(d => d.id !== deviceId),
    })),

    // wykres
    chartData: [],
    isChartLoading: false,
    activeChartDeviceId: null,

    setActiveChartDevice: (deviceId) => set({ activeChartDeviceId: deviceId }),

    appendChartData: (device) => {
        const callback = get().liveUpdateCallback;
        if (callback) {
            callback(device);
        }
    },

    snackbar: { open: false, message: '', severity: 'info' },
    showSnackbar: (message, severity) => set({ snackbar: { open: true, message, severity } }),
    hideSnackbar: () => set(state => ({ snackbar: { ...state.snackbar, open: false } })),

    themeMode: 'dark',
    toggleThemeMode: () => set((state) => ({
        themeMode: state.themeMode === 'light' ? 'dark' : 'light',
    })),
    clearChartData: () => set({ chartData: [], isChartLoading: false, activeChartDeviceId: null }),
}));