import { useAppStore } from '../stores/appStore';
import { Grid, Paper, Box, Typography, Fade, Container } from '@mui/material';
import { AddDeviceForm } from '../components/AddDeviceForm';
import { EventSimulatorForm } from '../components/EventSimulatorForm';
import { Tune } from "@mui/icons-material";

export function DashboardView() {
    const devices = useAppStore((state) => state.devices);

    return (
        <Container maxWidth="xl">
        <Fade in timeout={600}>
            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    background: 'rgba(22, 22, 22, 0.6)',
                    border: '1px solid rgba(96, 165, 250, 0.1)',
                    borderRadius: 3,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Tune sx={{ color: 'primary.main', fontSize: 28 }} />
                    </Box>
                    <Typography variant="h5" component="h1">Control Panel</Typography>
                </Box>

                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <AddDeviceForm />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <EventSimulatorForm devices={devices} />
                    </Grid>
                </Grid>
            </Paper>
        </Fade>
        </Container>
    );
}