import { useCallback, useEffect, useState } from 'react';
import { type ChartDataPoint, useAppStore } from '../stores/appStore';
import type { Device, InfluxSensorRecord } from '../types';

const API_URL = import.meta.env.VITE_API_URL || globalThis.location.origin;
const MAX_CHART_POINTS = 1000;

export function useChart(deviceId: string | null) {
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
    const [selectedRange, setSelectedRange] = useState<string>('15m');
    const showSnackbar = useAppStore((state) => state.showSnackbar);

    const loadChartData = useCallback(
        async (range: string) => {
            if (!deviceId) {
                return;
            }
            setIsLoading(true);
            setSelectedRange(range);
            setChartData([]);
            try {
                const response = await fetch(
                    `${API_URL}/api/devices/${deviceId}/history?range=${range}`,
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
                            if (
                                !key.startsWith('_') &&
                                key !== 'result' &&
                                key !== 'table' &&
                                key !== 'deviceId'
                            ) {
                                const val = item[key];
                                if (
                                    typeof val === 'number' ||
                                    typeof val === 'string'
                                ) {
                                    point[key] = val;
                                }
                            }
                        });
                        return point;
                    })
                    .sort((a, b) => a.time - b.time);
                setChartData(formattedData);
            } catch (error) {
                let message = 'Failed to fetch history';
                if (error instanceof Error) {
                    message = error.message;
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
                const pointState = JSON.parse(device.currentState);
                const dataPoint: ChartDataPoint = { time: Date.now() };
                Object.keys(pointState).forEach((key) => {
                    const val = Number.parseFloat(pointState[key]);
                    if (!Number.isNaN(val)) {
                        dataPoint[key] = val;
                    }
                });

                if (Object.keys(dataPoint).length > 1) {
                    setChartData((prevData) => {
                        const newData = [...prevData, dataPoint];
                        if (newData.length > MAX_CHART_POINTS) {
                            return newData.slice(newData.length - MAX_CHART_POINTS);
                        }
                        return newData;
                    });
                }
            } catch {
                // Ignore errors live to avoid noise
            }
        },
        [deviceId],
    );

    useEffect(() => {
        if (deviceId) {
            void loadChartData(selectedRange).catch(console.error);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceId]);

    return {
        chartData,
        isLoading,
        viewMode,
        setViewMode,
        selectedRange,
        handleRangeChange: loadChartData,
        appendDataPoint,
    };
}