import type { Device } from '../types';
import { Card, CardContent, Typography, Box, Chip, IconButton, Stack, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SensorsIcon from '@mui/icons-material/Sensors';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import HistoryIcon from '@mui/icons-material/Timeline';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

interface DeviceCardProps {
    device: Device;
    onHistoryClick: () => void;
    onSimulateClick: () => void;
    onDelete: (deviceId: string) => void;
}

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
        <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            <CardContent sx={{ flexGrow: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        {device.role === 'SENSOR' ? <SensorsIcon color="primary" /> : <LightbulbIcon color="secondary" />}
                        <Typography variant="h6" component="div" noWrap>
                            {device.name}
                        </Typography>
                    </Stack>
                    <Chip
                        label={device.type.charAt(0)}
                        size="small"
                        title={device.type}
                        sx={{ fontWeight: 'bold' }}
                    />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    ID: {device.id}
                </Typography>
                <Box
                    component="pre"
                    sx={{
                        bgcolor: 'action.hover',
                        p: 1.5,
                        borderRadius: 1,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        maxHeight: 100,
                        overflowY: 'auto',
                    }}
                >
                    <code>{JSON.stringify(JSON.parse(device.currentState || '{}'), null, 2)}</code>
                </Box>
            </CardContent>
            <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', borderTop: 1, borderColor: 'divider' }}>
                <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Rename">
                        <IconButton size="small" onClick={handleRename}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <IconButton size="small" onClick={handleDelete}><DeleteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                </Stack>
                <Stack direction="row" spacing={0.5}>
                    {device.type === 'VIRTUAL' && (
                        <Tooltip title="Configure Simulation">
                            <IconButton size="small" onClick={onSimulateClick} color={device.simulationActive ? 'secondary' : 'default'}>
                                <AutoAwesomeIcon fontSize="small" sx={device.simulationActive ? { animation: 'spin 2s linear infinite' } : {}} />
                            </IconButton>
                        </Tooltip>
                    )}

                    <Tooltip title="View History">
                        <IconButton size="small" onClick={onHistoryClick}><HistoryIcon fontSize="small" /></IconButton>
                    </Tooltip>
                </Stack>
            </Box>
        </Card>
    );
}