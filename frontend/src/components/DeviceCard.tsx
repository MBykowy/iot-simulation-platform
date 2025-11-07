import type { Device } from '../types';
import { Card, CardContent, Typography, Box, Chip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const API_URL = 'http://localhost:8081';

interface DeviceCardProps {
    device: Device;
    onHistoryClick: () => void;
    onSimulateClick: () => void;
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

export function DeviceCard({ device, onHistoryClick, onSimulateClick, onDelete }: DeviceCardProps) {

    const handleRename = (event: React.MouseEvent) => {
        event.stopPropagation();
        const newName = window.prompt("Enter new name for the device:", device.name);

        if (newName && newName.trim() !== "" && newName !== device.name) {
            fetch(`${API_URL}/api/devices/${device.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName }),
            })
                .then(response => {
                    if (!response.ok) throw new Error('Failed to rename device');
                })
                .catch(err => console.error(err));
        }
    };

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
        <Card onClick={onHistoryClick} sx={{ cursor: 'pointer', position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
                <IconButton
                    aria-label="rename"
                    onClick={handleRename}
                    size="small"
                    sx={{ color: 'text.secondary', '&:hover': { color: 'primary.light' } }}
                >
                    <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                    aria-label="delete"
                    onClick={handleDelete}
                    size="small"
                    sx={{ color: 'text.secondary', '&:hover': { color: 'error.light' } }}
                >
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </Box>
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
                {device.type === 'VIRTUAL' && (
                    <IconButton
                        aria-label="simulate"
                        onClick={(e) => { e.stopPropagation(); onSimulateClick(); }}
                        size="small"
                        sx={{
                            position: 'absolute', top: 8, left: 8,
                            color: device.simulationActive ? 'secondary.main' : 'text.secondary',
                            '&:hover': { color: 'secondary.light' }
                        }}
                    >
                        <AutoAwesomeIcon fontSize="small"
                                         sx={device.simulationActive ? { animation: 'spin 2s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } } : {}}
                        />
                    </IconButton>
                )}

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