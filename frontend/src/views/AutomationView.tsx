import {useEffect} from 'react';
import {useAppStore} from '../stores/appStore';
import {AddRuleForm} from '../components/AddRuleForm';
import {
    Box,
    CircularProgress,
    Container,
    Fade,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Paper,
    Typography
} from '@mui/material';
import DeleteIcon from "@mui/icons-material/Delete";
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import {useRules} from '../hooks/useRules';

export function AutomationView() {

    const devices = useAppStore((state) => state.devices);
    const fetchDevices = useAppStore((state) => state.fetchDevices);

    const { rules, isLoading, deleteRule, refreshRules } = useRules();

    useEffect(() => {
        fetchDevices();
    }, [fetchDevices]);

    return (
        <Container maxWidth="xl">
            <Fade in timeout={800}>
                <Box>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 4,
                            mb: 4,
                            background: 'rgba(22, 22, 22, 0.6)',
                            border: '1px solid rgba(96, 165, 250, 0.1)',
                            borderRadius: 3
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5 }}>
                            <Box sx={{ p: 1.5, borderRadius: 2, background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <AccountTreeIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                            </Box>
                            <Typography variant="h5" component="h1">Automation Rules</Typography>
                        </Box>

                        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Existing Rules</Typography>

                        {isLoading ? (
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                                <CircularProgress />
                            </Box>
                        ) : rules.length > 0 ? (
                            <Paper variant="outlined" sx={{ background: 'transparent' }}>
                                <List>
                                    {rules.map(rule => (
                                        <ListItem
                                            key={rule.id}
                                            secondaryAction={
                                                <IconButton edge="end" aria-label="delete" onClick={() => deleteRule(rule.id)}>
                                                    <DeleteIcon color="error" />
                                                </IconButton>
                                            }
                                        >
                                            <ListItemText
                                                primary={rule.name}
                                                secondary={`ID: ${rule.id}`}
                                                primaryTypographyProps={{ color: 'text.primary' }}
                                                secondaryTypographyProps={{ color: 'text.secondary' }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        ) : (
                            <Box sx={{ py: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                                <Typography color="text.secondary">No rules defined yet. Use the form below to create one.</Typography>
                            </Box>
                        )}

                        <Box sx={{ mt: 4 }}>
                            <AddRuleForm devices={devices} onRuleAdded={refreshRules} />
                        </Box>
                    </Paper>
                </Box>
            </Fade>
        </Container>
    );
}