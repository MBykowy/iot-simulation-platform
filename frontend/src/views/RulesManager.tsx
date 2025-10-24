import { useState, useEffect } from 'react';
import type {Device} from '../types';
import { AddRuleForm } from '../components/AddRuleForm';
import { Box, Typography, List, ListItem, ListItemText, Paper } from '@mui/material';

const API_URL = 'http://localhost:8081';

interface Rule {
    id: string;
    name: string;
    triggerConfig: string;
    actionConfig: string;
}

interface RulesManagerProps {
    devices: Device[];
}

export function RulesManager({ devices }: RulesManagerProps) {
    const [rules, setRules] = useState<Rule[]>([]);

    const fetchRules = () => {
        fetch(`${API_URL}/api/rules`)
            .then(res => res.json())
            .then(data => setRules(Array.isArray(data) ? data : []))
            .catch(err => console.error("Failed to fetch rules:", err));
    };

    useEffect(() => {
        fetchRules();
    }, []);

    return (
        <Box>
            <Typography variant="h5" component="h2" gutterBottom>
                Automation Rules
            </Typography>
            <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6">Existing Rules</Typography>
                {rules.length > 0 ? (
                    <List>
                        {rules.map(rule => (
                            <ListItem key={rule.id}>
                                <ListItemText primary={rule.name} secondary={`ID: ${rule.id}`} />
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Typography color="text.secondary">No rules defined yet.</Typography>
                )}
            </Paper>
            <AddRuleForm devices={devices} onRuleAdded={fetchRules} />
        </Box>
    );
}