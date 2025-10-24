import type {Device} from '../types';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';

interface DeviceCardProps {
    device: Device;
    onClick: () => void;
}

const formatJson = (jsonString: string) => {
    try {
        const obj = JSON.parse(jsonString);
        return JSON.stringify(obj, null, 2);
    } catch (e) {
        return jsonString;
    }
};

export function DeviceCard({ device, onClick }: DeviceCardProps) {
    return (
        <Card onClick={onClick} sx={{ cursor: 'pointer' }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" component="div">
                        {device.name}
                    </Typography>
                    <Chip
                        label={device.ioType}
                        color={device.ioType === 'SENSOR' ? 'primary' : 'secondary'}
                        size="small"
                    />
                </Box>
                <Typography sx={{ mb: 1.5 }} color="text.secondary">
                    ID: {device.id}
                </Typography>
                <Box component="pre" sx={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: 1, borderRadius: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.875rem' }}>
                    <code>
                        {formatJson(device.currentState)}
                    </code>
                </Box>
            </CardContent>
        </Card>
    );
}