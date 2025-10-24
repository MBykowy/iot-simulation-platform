import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type {ChartDataPoint} from '../stores/chartStore';

interface RealTimeChartProps {
    data: ChartDataPoint[];
    type: 'smooth' | 'points';
}

export function RealTimeChart({ data, type }: RealTimeChartProps) {
    const dataKeys = data.length > 0
        ? Object.keys(data[0]).filter(key => key !== 'time')
        : [];

    const timeFormatter = (timestamp: number) => new Date(timestamp).toLocaleTimeString();

    return (
        <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
                <XAxis
                    dataKey="time"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={timeFormatter}
                    stroke="#888"
                />
                <YAxis stroke="#888" />
                <Tooltip
                    labelFormatter={timeFormatter}
                    contentStyle={{
                        backgroundColor: 'rgba(30, 30, 30, 0.8)',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                    }}
                />
                <Legend />
                {dataKeys.map((key, index) => (
                    <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={['#60a5fa', '#a78bfa', '#facc15'][index % 3]}
                        strokeWidth={2}
                        dot={type === 'points'}
                        isAnimationActive={false}
                        connectNulls={true}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}