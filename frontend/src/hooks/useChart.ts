import { useCallback, useEffect, useState, useMemo } from 'react';
import { type ChartDataPoint, useAppStore } from '../stores/appStore';
import type { Device, InfluxSensorRecord } from '../types';

const API_URL = import.meta.env.VITE_API_URL || globalThis.location.origin;
const OPTIMIZED_POINT_COUNT = 1000;
const MAX_LIVE_POINTS = 500;

export function useChart(deviceId: string | null) {
    const [fullData, setFullData] = useState<ChartDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
    const [selectedRange, setSelectedRange] = useState<string>('15m');
    const [isOptimized, setIsOptimized] = useState<boolean>(true);

    const showSnackbar = useAppStore((state) => state.showSnackbar);

    const chartData = useMemo(() => {
        if (!isOptimized || fullData.length <= OPTIMIZED_POINT_COUNT) {
            return fullData;
        }
        const step = Math.ceil(fullData.length / OPTIMIZED_POINT_COUNT);
        return fullData.filter((_, index) => index % step === 0);
    }, [fullData, isOptimized]);

    const loadChartData = useCallback(
        async (range: string) => {
            if (!deviceId) return;

            setIsLoading(true);
            setSelectedRange(range);
            setFullData([]);
            setIsOptimized(true);

            try {
                const response = await fetch(
                    `${API_URL}/api/devices/${deviceId}/history?start=${range}`,
                );
                if (!response.ok) throw new Error('Network response was not ok');

                const historyData = (await response.json()) as InfluxSensorRecord[];

                const formattedData = historyData
                    .map((item) => {
                        const point: ChartDataPoint = {
                            time: new Date(item._time).getTime(),
                        };
                        Object.keys(item).forEach((key) => {
                            if (!key.startsWith('_') && !['result', 'table', 'deviceId'].includes(key)) {
                                const val = item[key];
                                if (typeof val === 'number' || typeof val === 'string') {
                                    point[key] = val;
                                }
                            }
                        });
                        return point;
                    })
                    .sort((a, b) => a.time - b.time);

                setFullData(formattedData);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to fetch history';
                showSnackbar(message, 'error');
            } finally {
                setIsLoading(false);
            }
        },
        [deviceId, showSnackbar],
    );

    const appendDataPoint = useCallback(
        (device: Device) => {
            if (device.id !== deviceId) return;

            try {
                const pointState = JSON.parse(device.currentState);
                const dataPoint: ChartDataPoint = { time: Date.now() };

                Object.keys(pointState).forEach((key) => {
                    const val = Number.parseFloat(pointState[key]);
                    if (!Number.isNaN(val)) {
                        dataPoint[key] = val;
                    }
                });

                if (Object.keys(dataPoint).length > 1) {
                    setFullData((prevData) => {
                        const newData = [...prevData, dataPoint];
                        if (newData.length > MAX_LIVE_POINTS && selectedRange.includes('m')) {
                            return newData.slice(newData.length - MAX_LIVE_POINTS);
                        }
                        return newData;
                    });
                }
            } catch {
                // ignore live errors
            }
        },
        [deviceId, selectedRange],
    );

    useEffect(() => {
        if (deviceId) {
            void loadChartData(selectedRange);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceId]);

    return {
        chartData,
        totalPoints: fullData.length,
        isLoading,
        viewMode,
        setViewMode,
        selectedRange,
        isOptimized,
        setIsOptimized,
        handleRangeChange: loadChartData,
        appendDataPoint,
    };
}