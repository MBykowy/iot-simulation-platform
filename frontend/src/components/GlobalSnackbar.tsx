import { Snackbar, Alert } from '@mui/material';
import { useAppStore } from '../stores/appStore';

export function GlobalSnackbar() {
    const { snackbar, hideSnackbar } = useAppStore();

    const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        hideSnackbar();
    };

    return (
        <Snackbar
            open={snackbar.open}
            autoHideDuration={4000}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
            <Alert onClose={handleClose} severity={snackbar.severity} sx={{ width: '100%' }}>
                {snackbar.message}
            </Alert>
        </Snackbar>
    );
}