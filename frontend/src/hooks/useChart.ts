import {useCallback, useEffect, useState} from 'react';
import {type ChartDataPoint, useAppStore} from '../stores/appStore';
import type {Device, InfluxSensorRecord} from '../types';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
const MAX_CHART_POINTS = 200;

export function useChart(deviceId: string | null) {
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
    const [selectedRange, setSelectedRange] = useState<string>('15m');
    const showSnackbar = useAppStore((state) => state.showSnackbar);

    const loadChartData = useCallback(async (range: string) => {
        if (!deviceId) return;
        setIsLoading(true);
        setSelectedRange(range);
        setChartData([]);
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
            setChartData(formattedData);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to fetch history";
            showSnackbar(message, 'error');
            console.error("Failed to fetch history:", error);
        } finally {
            setIsLoading(false);
        }
    }, [deviceId, showSnackbar]);

    const appendDataPoint = useCallback((device: Device) => {
        if (device.id !== deviceId) return;
        try {
            const pointState = JSON.parse(device.currentState);
            const dataPoint: ChartDataPoint = { time: new Date().getTime() };
            Object.keys(pointState).forEach(key => {
                const val = parseFloat(pointState[key]);
                if (!isNaN(val)) dataPoint[key] = val;
            });

            if (Object.keys(dataPoint).length > 1) {
                setChartData(prevData => {
                    const newData = [...prevData, dataPoint];
                    if (newData.length > MAX_CHART_POINTS) {
                        return newData.slice(newData.length - MAX_CHART_POINTS);
                    }
                    return newData;
                });
            }
        } catch (error) {
            console.warn(`Failed to parse currentState for live update (deviceId: ${device.id}).`, error);
        }
    }, [deviceId]);

    useEffect(() => {
        if (deviceId) {
            loadChartData(selectedRange);
        }

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