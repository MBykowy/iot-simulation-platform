import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
    AppBar,
    Box,
    Drawer,
    IconButton,
    Toolbar,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { Sidebar } from '../components/Sidebar';
import {
    Brightness4,
    Brightness7,
    DeveloperBoard,
    Menu as MenuIcon,
} from '@mui/icons-material';
import { useAppStore } from '../stores/appStore';

const DRAWER_WIDTH = 240;

export function MainLayout() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);

    const { themeMode, toggleThemeMode } = useAppStore();

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const drawerContent = (
        <div>
            <Toolbar />
            <Sidebar />
        </div>
    );

    let themeIcon: React.ReactNode;
    if (themeMode === 'dark') {
        themeIcon = <Brightness7 />;
    } else {
        themeIcon = <Brightness4 />;
    }

    let drawerComponent: React.ReactNode;
    if (isMobile) {
        drawerComponent = (
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{ '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }}
            >
                {drawerContent}
            </Drawer>
        );
    } else {
        drawerComponent = (
            <Drawer
                variant="permanent"
                sx={{ '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }}
                open
            >
                {drawerContent}
            </Drawer>
        );
    }



    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            <AppBar
                position="fixed"
                sx={{
                    width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
                    ml: { md: `${DRAWER_WIDTH}px` },
                    background: 'rgba(22, 22, 22, 0.8)',
                    backdropFilter: 'blur(10px)',
                    borderBottom: 1,
                    borderColor: 'divider',
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { md: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <DeveloperBoard sx={{ mr: 1, display: { xs: 'none', md: 'flex' } }} />
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        IoT Platform
                    </Typography>
                    <IconButton sx={{ ml: 1 }} onClick={toggleThemeMode} color="inherit">
                        {themeIcon}
                    </IconButton>
                </Toolbar>
            </AppBar>

            <Box
                component="nav"
                sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
            >
                {drawerComponent}
            </Box>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }
                }}
            >
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
}