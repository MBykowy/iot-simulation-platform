import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../stores/appStore';
import { Box, FormGroup, FormControlLabel, Checkbox } from '@mui/material';

export function RealTimeChart() {
    const chartData = useAppStore((state) => state.chartData);

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

    const timeFormatter = (timestamp: number) => new Date(timestamp).toLocaleTimeString();

    return (
        <Box>
            <FormGroup row sx={{ mb: 2 }}>
                {allKeys.map(key => (
                    <FormControlLabel
                        key={key}
                        control={
                            <Checkbox
                                checked={visibleKeys[key] || false}
                                onChange={() => handleVisibilityChange(key)}
                                size="small"
                            />
                        }
                        label={key}
                    />
                ))}
            </FormGroup>

            <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
                    <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} tickFormatter={timeFormatter} stroke="#888" />
                    <YAxis stroke="#888" />
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