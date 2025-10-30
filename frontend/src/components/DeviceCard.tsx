import type {Device} from '../types';
import { Card, CardContent, Typography, Box, Chip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const API_URL = 'http://localhost:8081';

interface DeviceCardProps {
    device: Device;
    onClick: () => void;
    onDelete: (deviceId: string) => void;
}

const formatJson = (jsonString: string) => {
    try {
        const obj = JSON.parse(jsonString);
        return JSON.stringify(obj, null, 2);
    } catch (e) {
        return jsonString;
    }
};

export function DeviceCard({ device, onClick, onDelete }: DeviceCardProps) {

    const handleDelete = (event: React.MouseEvent) => {
        event.stopPropagation();

        if (window.confirm(`Are you sure you want to delete ${device.name}?`)) {
            fetch(`${API_URL}/api/devices/${device.id}`, { method: 'DELETE' })
                .then(response => {
                    if (response.ok) {
                        onDelete(device.id);
                    } else {
                        throw new Error('Failed to delete device');
                    }
                })
                .catch(err => console.error(err));
        }
    };

    return (
        <Card onClick={onClick} sx={{ cursor: 'pointer', position: 'relative' }}>
            <IconButton
                aria-label="delete"
                onClick={handleDelete}
                sx={{ position: 'absolute', top: 8, right: 8, color: 'text.secondary' }}
            >
                <DeleteIcon />
            </IconButton>
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