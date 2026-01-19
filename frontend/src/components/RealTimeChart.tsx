import { memo, useMemo, useState, useCallback, type ChangeEvent } from 'react';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Box, Checkbox, FormControlLabel, FormGroup } from '@mui/material';
import type { ChartDataPoint } from '../stores/appStore';

const DEFAULT_RANGE_MINUTES = 15;

const parseRangeToMs = (range: string): number => {
    const value = Number.parseInt(range.slice(0, -1), 10);
    const unit = range.slice(-1);
    switch (unit) {
        case 'm':
            return value * 60 * 1000;
        case 'h':
            return value * 60 * 60 * 1000;
        case 'd':
            return value * 24 * 60 * 60 * 1000;
        default:
            return DEFAULT_RANGE_MINUTES * 60 * 1000;
    }
};

const timeFormatter = (timestamp: number) => new Date(timestamp).toLocaleTimeString('en-GB');

type AxisDomain = number | 'auto' | 'dataMin' | 'dataMax';

interface RealTimeChartProps {
    readonly chartData: ChartDataPoint[];
    readonly selectedRange: string;
}

function RealTimeChartComponent({ chartData, selectedRange }: RealTimeChartProps) {
    const timeDomain = useMemo<[AxisDomain, AxisDomain]>(() => {
        const lastPoint = chartData.at(-1);
        if (!lastPoint) {
            return ['auto', 'auto'];
        }

        const latestTime = lastPoint.time;
        const rangeMs = parseRangeToMs(selectedRange);

        return [latestTime - rangeMs, latestTime];
    }, [chartData, selectedRange]);

    const allKeys = useMemo(() => {
        const keys = new Set<string>();
        chartData.forEach((point) => {
            Object.keys(point).forEach((key) => {
                if (key !== 'time') {
                    keys.add(key);
                }
            });
        });
        return Array.from(keys);
    }, [chartData]);

    const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

    useMemo(() => {
        const newVisibleKeys = { ...visibleKeys };
        let changed = false;
        allKeys.forEach((key) => {
            if (newVisibleKeys[key] === undefined) {
                newVisibleKeys[key] = true;
                changed = true;
            }
        });
        if (changed) {
            setVisibleKeys(newVisibleKeys);
        }
    }, [allKeys, visibleKeys]);

    const handleVisibilityChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = event.target;
        setVisibleKeys((prev) => ({ ...prev, [name]: checked }));
    }, []);

    return (
        <Box>
            <FormGroup row sx={{ mb: 2, justifyContent: 'center' }}>
                {allKeys.map((key) => {
                    const checkboxControl = (
                        <Checkbox
                            name={key}
                            checked={visibleKeys[key] ?? false}
                            onChange={handleVisibilityChange}
                            size='small'
                        />
                    );
                    return <FormControlLabel key={key} control={checkboxControl} label={key} />;
                })}
            </FormGroup>

            <ResponsiveContainer width='100%' height={400}>
                <LineChart data={chartData} syncId='anyId'>
                    <CartesianGrid strokeDasharray='3 3' stroke='rgba(255, 255, 255, 0.2)' />
                    <XAxis
                        dataKey='time'
                        type='number'
                        domain={timeDomain}
                        tickFormatter={timeFormatter}
                        stroke='#888'
                        allowDataOverflow
                    />
                    <YAxis stroke='#888' domain={['auto', 'auto']} />
                    <Tooltip
                        labelFormatter={timeFormatter}
                        contentStyle={{
                            backgroundColor: 'rgba(30, 30, 30, 0.8)',
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                        }}
                    />
                    <Legend />
                    {allKeys.map((key, index) => {
                        if (visibleKeys[key]) {
                            return (
                                <Line
                                    key={key}
                                    type='monotone'
                                    dataKey={key}
                                    stroke={['#60a5fa', '#a78bfa', '#facc15'][index % 3]}
                                    strokeWidth={2}
                                    dot={false}
                                    connectNulls
                                    isAnimationActive={false}
                                />
                            );
                        }
                        return null;
                    })}
                </LineChart>
            </ResponsiveContainer>
        </Box>
    );
}

export const RealTimeChart = memo(RealTimeChartComponent);