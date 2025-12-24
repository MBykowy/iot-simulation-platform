import type {Device} from '../types';
import {Box, Card, CardContent, Chip, IconButton, Stack, Tooltip, Typography} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SensorsIcon from '@mui/icons-material/Sensors';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import HistoryIcon from '@mui/icons-material/Timeline';
import {useDeviceActions} from '../hooks/useDeviceActions';


interface DeviceCardProps {
    device: Device;
    onHistoryClick: () => void;
    onSimulateClick: () => void;
}

export function DeviceCard({ device, onHistoryClick, onSimulateClick }: DeviceCardProps) {
    const { renameDevice, deleteDevice } = useDeviceActions();

    const handleRename = (event: React.MouseEvent) => {
        event.stopPropagation();
        renameDevice(device.id, device.name);
    };

    const handleDelete = (event: React.MouseEvent) => {
        event.stopPropagation();
        deleteDevice(device.id, device.name);
    };

    const parseState = (state: string): string => {
        try {
            return JSON.stringify(JSON.parse(state || '{}'), null, 2);
        } catch (e) {
            return state || '{}';
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
                    <code>{parseState(device.currentState)}</code>
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