import {useAppStore} from '../stores/appStore';
import {apiClient} from "../api/apiClient.ts";


export function useDeviceActions() {
    const removeDeviceFromStore = useAppStore((state) => state.removeDevice);
    const showSnackbar = useAppStore((state) => state.showSnackbar);

    const renameDevice = async (deviceId: string, currentName: string): Promise<boolean> => {
        const newName = window.prompt("Enter new name:", currentName);
        if (!newName || newName.trim() === "" || newName === currentName) return false;

        const result = await apiClient(`/api/devices/${deviceId}`, {
            method: 'PUT',
            body: { name: newName },
        });

        if (result) {
            showSnackbar(`Device renamed to "${newName}"`, 'success');
            return true;
        }
        return false;
    };

    const deleteDevice = async (deviceId: string, deviceName: string): Promise<boolean> => {
        if (!window.confirm(`Are you sure you want to delete ${deviceName}?`)) return false;

        const result = await apiClient(`/api/devices/${deviceId}`, { method: 'DELETE' });

        if (result) {
            removeDeviceFromStore(deviceId);
            showSnackbar(`Device "${deviceName}" deleted successfully.`, 'success');
            return true;
        }
        return false;
    };

    return { renameDevice, deleteDevice };
}