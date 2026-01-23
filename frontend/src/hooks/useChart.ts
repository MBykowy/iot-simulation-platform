import { useCallback, useEffect, useState, useMemo } from 'react';
import { type ChartDataPoint, useAppStore } from '../stores/appStore';
import type { Device, InfluxSensorRecord } from '../types';
import { API_URL } from '../api/apiClient';

const OPTIMIZED_POINT_COUNT = 1000;

// Helper to convert range string (e.g., "15m", "1h") to milliseconds
const getRangeDurationMs = (range: string): number => {
    const unit = range.slice(-1);
    const value = parseInt(range.slice(0, -1), 10);

    if (isNaN(value)) {
        return 15 * 60 * 1000; // Default 15m
    }

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 15 * 60 * 1000;
    }
};

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
            if (!deviceId) {
                return;
            }

            setIsLoading(true);
            setSelectedRange(range);
            setFullData([]);
            setIsOptimized(true);

            try {
                const response = await fetch(
                    `${API_URL}/api/devices/${deviceId}/history?start=${range}`,
                );
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

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
                let message: string;
                if (error instanceof Error) {
                    message = error.message;
                } else {
                    message = 'Failed to fetch history';
                }
                showSnackbar(message, 'error');
            } finally {
                setIsLoading(false);
            }
        },
        [deviceId, showSnackbar],
    );

    const appendDataPoint = useCallback(
        (device: Device) => {
            if (device.id !== deviceId) {
                return;
            }

            try {
                const pointState = device.currentState;
                const now = Date.now();
                const dataPoint: ChartDataPoint = { time: now };

                Object.keys(pointState).forEach((key) => {
                    const val = Number.parseFloat(String(pointState[key]));
                    if (!Number.isNaN(val)) {
                        dataPoint[key] = val;
                    }
                });

                if (Object.keys(dataPoint).length > 1) {
                    setFullData((prevData) => {
                        const newData = [...prevData, dataPoint];

                        const rangeMs = getRangeDurationMs(selectedRange);
                        const cutoffTime = now - (rangeMs * 1.1);

                        if (newData.length > 0 && newData[0].time < cutoffTime) {
                            const firstValidIndex = newData.findIndex(p => p.time >= cutoffTime);
                            if (firstValidIndex > 0) {
                                return newData.slice(firstValidIndex);
                            }
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