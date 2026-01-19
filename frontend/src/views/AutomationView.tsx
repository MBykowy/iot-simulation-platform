import { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Container,
    Fade,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
    Tooltip,
    Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import RefreshIcon from '@mui/icons-material/Refresh';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useAppStore } from '../stores/appStore';
import { AddRuleForm } from '../components/AddRuleForm';
import { useRules, type Rule } from '../hooks/useRules';

const REFRESH_INTERVAL_MS = 5000;

interface RuleItemProps {
    readonly rule: Rule;
    readonly onDelete: (id: string) => void;
}

function RuleItem({ rule, onDelete }: RuleItemProps) {
    const handleDelete = () => {
        onDelete(rule.id);
    };

    let tooltipTitle;
    let iconColor: 'success' | 'disabled';
    let iconSx;

    if (rule.active) {
        tooltipTitle = 'Active: Condition is currently met';
        iconColor = 'success';
        iconSx = {
            opacity: 1,
            filter: 'drop-shadow(0 0 4px #4caf50)',
        };
    } else {
        tooltipTitle = 'Inactive: Waiting for condition';
        iconColor = 'disabled';
        iconSx = {
            opacity: 0.3,
            filter: 'none',
        };
    }

    return (
        <ListItem
            secondaryAction={(
                <IconButton edge='end' aria-label='delete' onClick={handleDelete}>
                    <DeleteIcon color='error' />
                </IconButton>
            )}
            sx={{
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                '&:last-child': { borderBottom: 'none' },
            }}
        >
            <ListItemIcon sx={{ minWidth: 40 }}>
                <Tooltip title={tooltipTitle}>
                    <FiberManualRecordIcon
                        fontSize='small'
                        color={iconColor}
                        sx={iconSx}
                    />
                </Tooltip>
            </ListItemIcon>
            <ListItemText
                primary={<Typography color='text.primary' fontWeight={500}>{rule.name}</Typography>}
                secondary={
                    <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                        ID: {rule.id.substring(0, 8)}...
                    </Typography>
                }
            />
        </ListItem>
    );
}

export function AutomationView() {
    const devices = useAppStore((state) => state.devices);
    const fetchDevices = useAppStore((state) => state.fetchDevices);

    const { rules, isLoading, deleteRule, refreshRules } = useRules();
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    useEffect(() => {
        const init = async () => {
            await fetchDevices();
            setHasLoadedOnce(true);
        };
        void init();
    }, [fetchDevices]);

    useEffect(() => {
        if (!isLoading) {
            setHasLoadedOnce(true);
        }
    }, [isLoading, rules.length]);

    useEffect(() => {
        const interval = setInterval(() => {
            void refreshRules().catch(() => {});
        }, REFRESH_INTERVAL_MS);
        return () => {
            clearInterval(interval);
        };
    }, [refreshRules]);

    const handleRefresh = useCallback(() => {
        void refreshRules();
    }, [refreshRules]);

    let content: React.ReactNode;

    if (isLoading && !hasLoadedOnce) {
        content = (
            <Box sx={{ py: 4, textAlign: 'center' }}>
                <CircularProgress />
            </Box>
        );
    } else if (rules.length > 0) {
        content = (
            <Paper variant='outlined' sx={{ background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.1)' }}>
                <List disablePadding>
                    {rules.map((rule) => (
                        <RuleItem key={rule.id} rule={rule} onDelete={deleteRule} />
                    ))}
                </List>
            </Paper>
        );
    } else {
        content = (
            <Box
                sx={{
                    py: 4,
                    textAlign: 'center',
                    border: '1px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                }}
            >
                <Typography color='text.secondary'>
                    No rules defined yet. Use the form below to create one.
                </Typography>
            </Box>
        );
    }

    return (
        <Container maxWidth='xl'>
            <Fade in timeout={800}>
                <Box>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 4,
                            mb: 4,
                            background: 'rgba(22, 22, 22, 0.6)',
                            border: '1px solid rgba(96, 165, 250, 0.1)',
                            borderRadius: 3,
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <AccountTreeIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                                </Box>
                                <Typography variant='h5' component='h1'>
                                    Automation Rules
                                </Typography>
                            </Box>

                            <Button
                                startIcon={<RefreshIcon />}
                                onClick={handleRefresh}
                                size='small'
                                variant='outlined'
                            >
                                Refresh
                            </Button>
                        </Box>

                        {content}

                        <Box sx={{ mt: 4 }}>
                            <AddRuleForm devices={devices} onRuleAdded={refreshRules} />
                        </Box>
                    </Paper>
                </Box>
            </Fade>
        </Container>
    );
}