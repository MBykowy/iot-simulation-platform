import { useState } from 'react';
import { type Device, CommandMode } from '../types';
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Modal,
    Select,
    type SelectChangeEvent,
    TextField,
    Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { apiClient } from '../api/apiClient';
import { useAppStore } from '../stores/appStore';

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    borderRadius: 3,
} as const;

interface DeviceCommandModalProps {
    readonly device: Device | null;
    readonly open: boolean;
    readonly onClose: () => void;
}

export function DeviceCommandModal({ device, open, onClose }: DeviceCommandModalProps) {
    const [commandType, setCommandType] = useState<CommandMode>(CommandMode.PRESET);
    const [presetAction, setPresetAction] = useState('ON');
    const [customJson, setCustomJson] = useState('{"status": "ON"}');
    const showSnackbar = useAppStore((state) => state.showSnackbar);

    const handleSend = async () => {
        if (!device) { return; }

        let payload: Record<string, unknown>;

        try {
            if (commandType === CommandMode.PRESET) {
                payload = { status: presetAction };
            } else {
                payload = JSON.parse(customJson) as Record<string, unknown>;
            }
        } catch {
            showSnackbar('Invalid JSON format in custom command', 'error');
            return;
        }

        const result = await apiClient<void>(`/api/devices/${device.id}/command`, {
            method: 'POST',
            body: payload,
        });

        if (result !== null) {
            showSnackbar(`Command sent successfully to ${device.name}`, 'success');
            onClose();
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={style}>
                <Typography variant="h6" gutterBottom>
                    Control Device: {device?.name}
                </Typography>

                <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                    <Button
                        variant={commandType === CommandMode.PRESET ? 'contained' : 'outlined'}
                        onClick={() => setCommandType(CommandMode.PRESET)}
                        size="small"
                    >
                        Preset
                    </Button>
                    <Button
                        variant={commandType === CommandMode.JSON ? 'contained' : 'outlined'}
                        onClick={() => setCommandType(CommandMode.JSON)}
                        size="small"
                    >
                        JSON
                    </Button>
                </Box>

                {commandType === CommandMode.PRESET ? (
                    <FormControl fullWidth sx={{ mt: 1 }}>
                        <InputLabel>Action</InputLabel>
                        <Select
                            value={presetAction}
                            label="Action"
                            onChange={(e: SelectChangeEvent) => setPresetAction(e.target.value)}
                        >
                            <MenuItem value="ON">ON</MenuItem>
                            <MenuItem value="OFF">OFF</MenuItem>
                            <MenuItem value="RESET">RESET</MenuItem>
                        </Select>
                    </FormControl>
                ) : (
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Command Payload"
                        value={customJson}
                        onChange={(e) => setCustomJson(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                )}

                <Button
                    fullWidth
                    variant="contained"
                    color="secondary"
                    startIcon={<SendIcon />}
                    onClick={() => { void handleSend(); }}
                    sx={{ mt: 3 }}
                >
                    Dispatch Command
                </Button>
            </Box>
        </Modal>
    );
}