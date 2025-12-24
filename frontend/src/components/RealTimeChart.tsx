import {useEffect, useMemo, useState} from 'react';
import {CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Box, Checkbox, FormControlLabel, FormGroup} from '@mui/material';
import type {ChartDataPoint} from '../stores/appStore';

const parseRangeToMs = (range: string): number => {
    const value = parseInt(range.slice(0, -1));
    const unit = range.slice(-1);
    switch (unit) {
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 60 * 60 * 1000;
    }
};

type AxisDomain = number | 'auto' | 'dataMin' | 'dataMax';

interface RealTimeChartProps {
    chartData: ChartDataPoint[];
    selectedRange: string;
}

export function RealTimeChart({ chartData, selectedRange }: RealTimeChartProps) {
    const [timeDomain, setTimeDomain] = useState<[AxisDomain, AxisDomain]>(['auto', 'auto']);

    useEffect(() => {
        const rangeMs = parseRangeToMs(selectedRange);
        const updateDomain = () => {
            const now = Date.now();
            setTimeDomain([now - rangeMs, now]);
        };
        updateDomain();
        const intervalId = setInterval(updateDomain, 1000);
        return () => clearInterval(intervalId);
    }, [selectedRange]);

    const allKeys = useMemo(() => {
        const keys = new Set<string>();
        chartData.forEach(point => {
            Object.keys(point).forEach(key => {
                if (key !== 'time') keys.add(key);
            });
        });
        return Array.from(keys);
    }, [chartData]);

    const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

    useMemo(() => {
        const newVisibleKeys = { ...visibleKeys };
        let changed = false;
        allKeys.forEach(key => {
            if (newVisibleKeys[key] === undefined) {
                newVisibleKeys[key] = true;
                changed = true;
            }
        });
        if (changed) setVisibleKeys(newVisibleKeys);
    }, [allKeys, visibleKeys]);

    const handleVisibilityChange = (key: string) => {
        setVisibleKeys(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const timeFormatter = (timestamp: number) => new Date(timestamp).toLocaleTimeString('en-GB');

    return (
        <Box>
            <FormGroup row sx={{ mb: 2, justifyContent: 'center' }}>
                {allKeys.map(key => (
                    <FormControlLabel
                        key={key}
                        control={<Checkbox checked={visibleKeys[key] || false} onChange={() => handleVisibilityChange(key)} size="small" />}
                        label={key}
                    />
                ))}
            </FormGroup>

            <ResponsiveContainer width="100%" height={400}>
                {/* ... (reszta JSX bez zmian) ... */}
                <LineChart data={chartData} syncId="anyId">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
                    <XAxis
                        dataKey="time"
                        type="number"
                        domain={timeDomain}
                        tickFormatter={timeFormatter}
                        stroke="#888"
                        allowDataOverflow={true}
                    />
                    <YAxis stroke="#888" domain={['auto', 'auto']} />
                    <Tooltip labelFormatter={timeFormatter} contentStyle={{ backgroundColor: 'rgba(30, 30, 30, 0.8)', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                    <Legend />
                    {allKeys.map((key, index) => (
                        visibleKeys[key] && (
                            <Line
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stroke={['#60a5fa', '#a78bfa', '#facc15'][index % 3]}
                                strokeWidth={2}
                                dot={false}
                                connectNulls={true}
                                isAnimationActive={false}
                            />
                        )
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </Box>
    );
}