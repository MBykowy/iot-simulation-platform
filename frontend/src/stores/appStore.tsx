import { create } from 'zustand';
import type {Device, InfluxSensorRecord} from '../types';

const API_URL = '';
const MAX_CHART_POINTS = 200;

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
    loadChartData: (deviceId: string, range: string) => Promise<void>;
    appendChartData: (device: Device) => void;
    clearChartData: () => void;
    selectedRange: string;
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

    loadChartData: async (deviceId, range) => {
        set({ isChartLoading: true, chartData: [], selectedRange: range });
        try {
            const response = await fetch(`${API_URL}/api/devices/${deviceId}/history?range=${range}`);
            if (!response.ok) throw new Error('Network response was not ok');

            const historyData = await response.json() as InfluxSensorRecord[];

            const formattedData = historyData.map((item) => {
                const point: ChartDataPoint = { time: new Date(item._time).getTime() };

                Object.keys(item).forEach(key => {
                    if (!key.startsWith('_') && key !== 'result' && key !== 'table' && key !== 'deviceId') {
                        const val = item[key];
                        if (typeof val === 'number' || typeof val === 'string') {
                            point[key] = val;
                        }
                    }
                });
                return point;
            }).sort((a, b) => a.time - b.time);

            set({ chartData: formattedData, isChartLoading: false });
        } catch (error) {
            console.error("Failed to fetch history:", error);
            set({ isChartLoading: false });
        }
    },

    appendChartData: (device) => {
        if (device.role !== 'SENSOR' || device.id !== get().activeChartDeviceId) {
            return;
        }
        try {
            const pointState = JSON.parse(device.currentState);
            const dataPoint: ChartDataPoint = { time: new Date().getTime() };
            Object.keys(pointState).forEach(key => {
                const val = parseFloat(pointState[key]);
                if (!isNaN(val)) dataPoint[key] = val;
            });

            if (Object.keys(dataPoint).length > 1) {
                set(state => {
                    const newData = [...state.chartData, dataPoint];
                    if (newData.length > MAX_CHART_POINTS) newData.shift();
                    return { chartData: newData };
                });
            }
        } catch {}
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