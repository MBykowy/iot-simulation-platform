// src/stores/chartStore.ts
import { create } from 'zustand';

const MAX_DATA_POINTS = 100;
export interface ChartDataPoint {
    time: number;
    [key: string]: number | string;
}

interface ChartState {
    data: ChartDataPoint[];
    isLoading: boolean;
    loadInitialData: (deviceId: string, range: string) => Promise<void>;
    addDataPoint: (deviceId: string, newPoint: any) => void;
    clearData: () => void;
}

const API_URL = 'http://localhost:8081';

export const useChartStore = create<ChartState>((set, get) => ({
    data: [],
    isLoading: false,

    loadInitialData: async (deviceId, range) => {
        set({ isLoading: true, data: [] });
        try {
            const response = await fetch(`${API_URL}/api/devices/${deviceId}/history?range=${range}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const historyData = await response.json();

            const formattedData = historyData.map((item: any) => {
                const point: ChartDataPoint = { time: new Date(item._time).getTime() };
                Object.keys(item).forEach(key => {
                    if (!key.startsWith('_') && key !== 'result' && key !== 'table' && key !== 'deviceId') {
                        point[key] = item[key];
                    }
                });
                return point;
            }).sort((a: ChartDataPoint, b: ChartDataPoint) => a.time - b.time); // Sortujemy na wszelki wypadek

            set({ data: formattedData, isLoading: false });
        } catch (error) {
            console.error("Failed to fetch history:", error);
            set({ isLoading: false });
        }
    },

    addDataPoint: (deviceId, newPoint) => {
        const pointState = JSON.parse(newPoint.currentState);

        const dataPoint: ChartDataPoint = { time: new Date().getTime() };
        Object.keys(pointState).forEach(key => {
            const val = parseFloat(pointState[key]);
            if (!isNaN(val)) {
                dataPoint[key] = val;
            }
        });

        // Dodajemy tylko jeśli punkt ma dane
        if (Object.keys(dataPoint).length > 1) {
            set(state => {
                const newData = [...state.data, dataPoint];
                if (newData.length > MAX_DATA_POINTS) {
                    newData.shift();
                }
                return { data: newData };
            });
        }
    },

    clearData: () => set({ data: [], isLoading: false }),
}));