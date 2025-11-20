import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore'; // <--- Dodano import store'a
import { AddRuleForm } from '../components/AddRuleForm';
import { Box, Typography, List, ListItem, ListItemText, Paper, IconButton, Fade } from '@mui/material'; // Dodano Fade dla spójności
import DeleteIcon from "@mui/icons-material/Delete";
import AccountTreeIcon from '@mui/icons-material/AccountTree';

const API_URL = 'http://localhost:8081';

interface Rule {
    id: string;
    name: string;
    triggerConfig: string;
    actionConfig: string;
}

export function AutomationView() {
    const devices = useAppStore((state) => state.devices);
    const fetchDevices = useAppStore((state) => state.fetchDevices);

    const [rules, setRules] = useState<Rule[]>([]);

    useEffect(() => {
        fetchDevices();
    }, [fetchDevices]);

    const fetchRules = () => {
        fetch(`${API_URL}/api/rules`)
            .then(res => res.json())
            .then(data => setRules(Array.isArray(data) ? data : []))
            .catch(err => console.error("Failed to fetch rules:", err));
    };

    useEffect(() => {
        fetchRules();
    }, []);

    const handleDeleteRule = (ruleId: string) => {
        if (window.confirm('Are you sure you want to delete this rule?')) {
            fetch(`${API_URL}/api/rules/${ruleId}`, { method: 'DELETE' })
                .then(response => {
                    if (response.ok) {
                        setRules(prevRules => prevRules.filter(r => r.id !== ruleId));
                    } else {
                        throw new Error('Failed to delete rule');
                    }
                })
                .catch(err => console.error(err));
        }
    };

    return (
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
                    {rules.length > 0 ? (
                        <Paper variant="outlined" sx={{ background: 'transparent' }}>
                            <List>
                                {rules.map(rule => (
                                    <ListItem
                                        key={rule.id}
                                        secondaryAction={
                                            <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteRule(rule.id)}>
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
                        <Box sx={{ py: 4, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 2 }}>
                            <Typography color="text.secondary">No rules defined yet.</Typography>
                        </Box>
                    )}

                    <Box sx={{ mt: 4 }}>
                        <AddRuleForm devices={devices} onRuleAdded={fetchRules} />
                    </Box>
                </Paper>
            </Box>
        </Fade>
    );
}