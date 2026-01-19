import { useState, type ChangeEvent } from 'react';
import { type Device, CommandMode, ApiEndpoint } from '../types';
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
        if (!device) {
            return;
        }

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

        const result = await apiClient<void>(`${ApiEndpoint.DEVICES}/${device.id}/command`, {
            method: 'POST',
            body: payload,
        });

        if (result !== null) {
            showSnackbar(`Command sent successfully to ${device.name}`, 'success');
            onClose();
        }
    };

    const handleVoidSend = () => {
        void handleSend();
    };

    const handleSetPresetMode = () => {
        setCommandType(CommandMode.PRESET);
    };

    const handleSetJsonMode = () => {
        setCommandType(CommandMode.JSON);
    };

    const handlePresetActionChange = (event: SelectChangeEvent) => {
        setPresetAction(event.target.value);
    };

    const handleCustomJsonChange = (event: ChangeEvent<HTMLInputElement>) => {
        setCustomJson(event.target.value);
    };

    let presetButtonVariant: 'contained' | 'outlined';
    let jsonButtonVariant: 'contained' | 'outlined';
    if (commandType === CommandMode.PRESET) {
        presetButtonVariant = 'contained';
        jsonButtonVariant = 'outlined';
    } else {
        presetButtonVariant = 'outlined';
        jsonButtonVariant = 'contained';
    }

    let formContent: React.ReactNode;
    if (commandType === CommandMode.PRESET) {
        formContent = (
            <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel>Action</InputLabel>
                <Select
                    value={presetAction}
                    label='Action'
                    onChange={handlePresetActionChange}
                >
                    <MenuItem value='ON'>ON</MenuItem>
                    <MenuItem value='OFF'>OFF</MenuItem>
                    <MenuItem value='RESET'>RESET</MenuItem>
                </Select>
            </FormControl>
        );
    } else {
        formContent = (
            <TextField
                fullWidth
                multiline
                rows={4}
                label='Command Payload'
                value={customJson}
                onChange={handleCustomJsonChange}
                sx={{ mt: 1 }}
            />
        );
    }

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={style}>
                <Typography variant='h6' gutterBottom>
                    Control Device: {device?.name}
                </Typography>

                <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                    <Button
                        variant={presetButtonVariant}
                        onClick={handleSetPresetMode}
                        size='small'
                    >
                        Preset
                    </Button>
                    <Button
                        variant={jsonButtonVariant}
                        onClick={handleSetJsonMode}
                        size='small'
                    >
                        JSON
                    </Button>
                </Box>

                {formContent}

                <Button
                    fullWidth
                    variant='contained'
                    color='secondary'
                    startIcon={<SendIcon />}
                    onClick={handleVoidSend}
                    sx={{ mt: 3 }}
                >
                    Dispatch Command
                </Button>
            </Box>
        </Modal>
    );
}