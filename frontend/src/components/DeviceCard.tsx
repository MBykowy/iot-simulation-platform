import type { ReactNode } from 'react';
import type { Device } from '../types';
import { Box, Card, CardContent, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SensorsIcon from '@mui/icons-material/Sensors';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import HistoryIcon from '@mui/icons-material/Timeline';
import { useDeviceActions } from '../hooks/useDeviceActions';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';

interface DeviceCardProps {
    readonly device: Device;
    readonly onHistoryClick: () => void;
    readonly onSimulateClick: () => void;
    readonly onCommandClick: () => void;
}


export function DeviceCard({ device, onHistoryClick, onSimulateClick, onCommandClick }: DeviceCardProps) {
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
        } catch {
            return state || '{}';
        }
    };

    let roleIcon: ReactNode;
    if (device.role === 'SENSOR') {
        roleIcon = <SensorsIcon color="primary" />;
    } else {
        roleIcon = <LightbulbIcon color="secondary" />;
    }

    let simulationButtonColor: 'secondary' | 'default';
    if (device.simulationActive) {
        simulationButtonColor = 'secondary';
    } else {
        simulationButtonColor = 'default';
    }

    let simulationIconSx;
    if (device.simulationActive) {
        simulationIconSx = { animation: 'spin 2s linear infinite' };
    } else {
        simulationIconSx = {};
    }

    return (
        <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            <CardContent sx={{ flexGrow: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        {roleIcon}
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
                        <IconButton size="small" onClick={handleRename}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <IconButton size="small" onClick={handleDelete}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    {(device.role === 'ACTUATOR' || device.type === 'PHYSICAL') && (
                        <Tooltip title="Send Command">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onCommandClick(); }} color="secondary">
                                <PowerSettingsNewIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
                <Stack direction="row" spacing={0.5}>
                    {device.type === 'VIRTUAL' && (
                        <Tooltip title="Configure Simulation">
                            <IconButton
                                size="small"
                                onClick={onSimulateClick}
                                color={simulationButtonColor}
                            >
                                <AutoAwesomeIcon fontSize="small" sx={simulationIconSx} />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title="View History">
                        <IconButton size="small" onClick={onHistoryClick}>
                            <HistoryIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>
        </Card>
    );
}