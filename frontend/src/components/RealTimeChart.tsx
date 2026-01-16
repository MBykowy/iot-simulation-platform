import { memo, useMemo, useState } from 'react';
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
            return 15 * 60 * 1000;
    }
};

type AxisDomain = number | 'auto' | 'dataMin' | 'dataMax';

interface RealTimeChartProps {
    readonly chartData: ChartDataPoint[];
    readonly selectedRange: string;
}

function RealTimeChartComponent({ chartData, selectedRange }: RealTimeChartProps) {
    const timeDomain = useMemo<[AxisDomain, AxisDomain]>(() => {
        if (chartData.length === 0) {
            return ['auto', 'auto'];
        }

        const lastPoint = chartData[chartData.length - 1];
        const latestTime = lastPoint.time;
        const rangeMs = parseRangeToMs(selectedRange);

        // Define window: [Latest Time - Range, Latest Time]
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

    // Sync visible keys when data structure changes
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

    const createVisibilityChangeHandler = (key: string) => () => {
        setVisibleKeys((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const timeFormatter = (timestamp: number) => new Date(timestamp).toLocaleTimeString('en-GB');

    return (
        <Box>
            <FormGroup row sx={{ mb: 2, justifyContent: 'center' }}>
                {allKeys.map((key) => {
                    const checkboxControl = (
                        <Checkbox
                            checked={visibleKeys[key] ?? false}
                            onChange={createVisibilityChangeHandler(key)}
                            size="small"
                        />
                    );
                    return <FormControlLabel key={key} control={checkboxControl} label={key} />;
                })}
            </FormGroup>

            <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} syncId="anyId">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
                    <XAxis
                        dataKey="time"
                        type="number"
                        domain={timeDomain}
                        tickFormatter={timeFormatter}
                        stroke="#888"
                        allowDataOverflow
                    />
                    <YAxis stroke="#888" domain={['auto', 'auto']} />
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
                                    type="monotone"
                                    dataKey={key}
                                    stroke={['#60a5fa', '#a78bfa', '#facc15'][index % 3]}
                                    strokeWidth={2}
                                    dot={false}
                                    connectNulls
                                    isAnimationActive={false} // Performance optimization
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