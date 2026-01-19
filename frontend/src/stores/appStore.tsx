import { create } from 'zustand';
import { ApiEndpoint, type Device } from '../types';
import { apiClient } from '../api/apiClient';

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
    // Domain
    devices: Device[];
    fetchDevices: () => Promise<void>;
    addOrUpdateDevice: (device: Device) => void;
    updateDevicesBatch: (updates: Device[]) => void;
    removeDevice: (deviceId: string) => void;

    // Chart
    chartData: ChartDataPoint[];
    isChartLoading: boolean;
    activeChartDeviceId: string | null;
    setActiveChartDevice: (deviceId: string | null) => void;
    appendChartData: (device: Device) => void;
    clearChartData: () => void;
    selectedRange: string;
    setChartData: (data: ChartDataPoint[]) => void;

    // Live
    liveUpdateCallback: ((device: Device) => void) | null;
    setLiveUpdateCallback: (callback: ((device: Device) => void) | null) => void;

    // UI
    themeMode: 'light' | 'dark';
    toggleThemeMode: () => void;
    snackbar: SnackbarState;
    showSnackbar: (message: string, severity: SnackbarSeverity) => void;
    hideSnackbar: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
    //  Devices
    devices: [],

    fetchDevices: async () => {
        try {
            const data = await apiClient<Device[]>(ApiEndpoint.DEVICES, { method: 'GET' });
            if (Array.isArray(data)) {
                set({ devices: data });
            } else {
                set({ devices: [] });
            }
        } catch {
            set({ devices: [] });
        }
    },

    addOrUpdateDevice: (device) => set((state) => {
        const index = state.devices.findIndex((d) => d.id === device.id);
        if (index > -1) {
            const newDevices = [...state.devices];
            newDevices[index] = device;
            return { devices: newDevices };
        }
        return { devices: [...state.devices, device] };
    }),

    // batch update
    updateDevicesBatch: (updates) => set((state) => {
        if (updates.length === 0) {
            return {};
        }

        const deviceMap = new Map(state.devices.map(d => [d.id, d]));
        let hasChanges = false;

        updates.forEach(device => {
            const current = deviceMap.get(device.id);

            if (!current ||
                current.currentState !== device.currentState ||
                current.simulationActive !== device.simulationActive ||
                current.online !== device.online
            ) {
                deviceMap.set(device.id, device);
                hasChanges = true;
            }
        });

        if (!hasChanges) {
            return {};
        }

        return { devices: Array.from(deviceMap.values()) };
    }),

    removeDevice: (deviceId) => set((state) => ({
        devices: state.devices.filter((d) => d.id !== deviceId),
    })),

    //  Chart
    chartData: [],
    isChartLoading: false,
    activeChartDeviceId: null,
    selectedRange: '15m',
    liveUpdateCallback: null,

    setActiveChartDevice: (deviceId) => set({ activeChartDeviceId: deviceId }),

    setChartData: (data) => set({ chartData: data }),

    clearChartData: () => set({ chartData: [], isChartLoading: false, activeChartDeviceId: null }),

    setLiveUpdateCallback: (callback) => set({ liveUpdateCallback: callback }),

    appendChartData: (device) => {
        const callback = get().liveUpdateCallback;
        if (callback) {
            callback(device);
        }
    },

    //  UI
    snackbar: { open: false, message: '', severity: 'info' },

    showSnackbar: (message, severity) => set({ snackbar: { open: true, message, severity } }),

    hideSnackbar: () => set((state) => ({ snackbar: { ...state.snackbar, open: false } })),

    themeMode: 'dark',
    toggleThemeMode: () => set((state) => {
        let newThemeMode: 'light' | 'dark';
        if (state.themeMode === 'light') {
            newThemeMode = 'dark';
        } else {
            newThemeMode = 'light';
        }
        return {
            themeMode: newThemeMode,
        };
    }),
}));