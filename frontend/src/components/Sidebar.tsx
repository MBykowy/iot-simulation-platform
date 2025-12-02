import { Link as RouterLink } from 'react-router-dom';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DevicesIcon from '@mui/icons-material/Dns';
import AutomationIcon from '@mui/icons-material/AccountTree';
import LogsIcon from '@mui/icons-material/Terminal';

const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Devices', icon: <DevicesIcon />, path: '/devices' },
    { text: 'Automation', icon: <AutomationIcon />, path: '/automation' },
    { text: 'System Logs', icon: <LogsIcon />, path: '/logs' },
];

export function Sidebar() {
    return (
        <Box sx={{ width: 240, flexShrink: 0 }}>
            <List>
                {navItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton component={RouterLink} to={item.path}>
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Box>
    );
}