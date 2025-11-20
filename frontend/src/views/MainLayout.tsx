import { Outlet } from 'react-router-dom';
import { Box, Toolbar, AppBar, Typography, Container } from '@mui/material';
import { Sidebar } from '../components/Sidebar';
import { DeveloperBoard } from "@mui/icons-material";

export function MainLayout() {
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)' }}>
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    background: 'rgba(22, 22, 22, 0.8)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(96, 165, 250, 0.1)',
                }}
            >
                <Toolbar sx={{ py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <DeveloperBoard sx={{ fontSize: 32, color: '#60a5fa' }} />
                        <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                            IoT Simulation Platform
                        </Typography>
                    </Box>
                </Toolbar>
            </AppBar>

            <Box
                component="nav"
                sx={{
                    width: 240,
                    flexShrink: 0,
                    borderRight: '1px solid rgba(96, 165, 250, 0.1)',
                    background: 'rgba(22, 22, 22, 0.6)',
                }}
            >
                <Toolbar />
                <Sidebar />
            </Box>

            <Box component="main" sx={{ flexGrow: 1, p: 3, width: `calc(100% - 240px)` }}>
                <Toolbar />
                <Container maxWidth="xl">
                    <Outlet />
                </Container>
            </Box>
        </Box>
    );
}