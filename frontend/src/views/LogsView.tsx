import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useWebSocketSubscription } from '../contexts/WebSocketProvider';
import { Box, Paper, Chip, Switch, FormControlLabel, CircularProgress, Grid, TextField, FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip } from '@mui/material';
import { LogEntry } from '../components/LogEntry';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { useAppStore } from "../stores/appStore.tsx";
import type { Device } from "../types.ts";
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

let logCounter = 0;
const API_URL = '';

interface LogMessage {
    id: number;
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    loggerName: string;
    message: string;
}

const LOG_BUFFER_SIZE = 500;

const influxToLogMessage = (influxRecord: any): LogMessage => ({
    id: logCounter++,
    timestamp: influxRecord._time,
    level: influxRecord.level,
    loggerName: influxRecord.loggerName,
    message: influxRecord.message,
});

const levelColors = {
    INFO: 'primary',
    WARN: 'warning',
    ERROR: 'error',
} as const;

export function LogsView() {
    const devices = useAppStore((state) => state.devices);
    useEffect(() => {
        useAppStore.getState().fetchDevices();
    }, []);

    const [allLogs, setAllLogs] = useState<LogMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterLevels, setFilterLevels] = useState({ INFO: true, WARN: true, ERROR: true });
    const [searchText, setSearchText] = useState('');
    const [selectedDeviceId, setSelectedDeviceId] = useState('');

    const subscriptionManager = useWebSocketSubscription();
    const [follow, setFollow] = useState(true);
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${API_URL}/api/logs/history?range=1h`);
                if (!response.ok) throw new Error('Failed to fetch log history');
                const data = await response.json();
                const historicalLogs = data.map(influxToLogMessage);
                setAllLogs(historicalLogs);
            } catch (err) {
                console.error("Failed to fetch log history", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();

        const subscription = subscriptionManager?.subscribe('/topic/logs', (message) => {
            const rawLog = JSON.parse(message.body);
            const newLog: LogMessage = {
                id: logCounter++,
                timestamp: rawLog.timestamp,
                level: rawLog.level,
                loggerName: rawLog.loggerName,
                message: rawLog.message,
            };
            setAllLogs(prevLogs => [...prevLogs, newLog]);
        });

        return () => subscription?.unsubscribe();
    }, [subscriptionManager]);

    const filteredLogs = useMemo(() => {
        return allLogs.filter(log => {
            const levelMatch = filterLevels[log.level];
            const textMatch = searchText === '' || log.message.toLowerCase().includes(searchText.toLowerCase());
            const deviceMatch = selectedDeviceId === '' || log.message.includes(selectedDeviceId);
            return levelMatch && textMatch && deviceMatch;
        });
    }, [allLogs, filterLevels, searchText, selectedDeviceId]);

    const visibleLogs = useMemo(() => filteredLogs.slice(-LOG_BUFFER_SIZE), [filteredLogs]);
    const firstItemIndex = Math.max(0, filteredLogs.length - LOG_BUFFER_SIZE);

    const scrollToBottom = useCallback(() => {
        if (virtuosoRef.current) {
            virtuosoRef.current.scrollToIndex({
                index: visibleLogs.length - 1,
                align: 'end',
                behavior: 'smooth',
            });
        }
    }, [visibleLogs.length]);

    const handleFollowSwitch = (checked: boolean) => {
        setFollow(checked);
        if (checked) {
            scrollToBottom();
        }
    };

    return (
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', boxSizing: 'border-box' }}>
            <Paper sx={{ p: 2, mb: 2, flexShrink: 0 }}>
                {/* Panel filtrów bez zmian */}
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField fullWidth size="small" label="Search logs..." value={searchText} onChange={e => setSearchText(e.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Filter by Device</InputLabel>
                            <Select value={selectedDeviceId} label="Filter by Device" onChange={e => setSelectedDeviceId(e.target.value)}>
                                <MenuItem value="">All Devices</MenuItem>
                                {devices.map((device: Device) => <MenuItem key={device.id} value={device.id}>{device.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 5 }} container alignItems="center" justifyContent="flex-end" spacing={1}>
                        <Tooltip title={subscriptionManager?.isConnected ? "Log stream connected" : "Log stream disconnected"}>
                            <IconButton color={subscriptionManager?.isConnected ? 'success' : 'error'}>
                                {subscriptionManager?.isConnected ? <WifiIcon /> : <WifiOffIcon />}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Scroll to Bottom">
                            <IconButton onClick={scrollToBottom}>
                                <ArrowDownwardIcon />
                            </IconButton>
                        </Tooltip>
                        <FormControlLabel control={<Switch checked={follow} onChange={(e) => handleFollowSwitch(e.target.checked)} />} label="Follow logs" />
                        {Object.keys(filterLevels).map(level => (
                            <Chip key={level} label={level} color={levelColors[level as keyof typeof levelColors]} size="small"
                                  variant={filterLevels[level as keyof typeof levelColors] ? 'filled' : 'outlined'}
                                  onClick={() => setFilterLevels(prev => ({...prev, [level]: !prev[level as keyof typeof levelColors]}))}
                                  sx={{ ml: 1, cursor: 'pointer' }} />
                        ))}
                    </Grid>
                </Grid>
            </Paper>

            <Paper sx={{ flexGrow: 1, overflow: 'hidden' }}>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Virtuoso
                        ref={virtuosoRef}
                        style={{ height: '100%' }}
                        data={visibleLogs}
                        firstItemIndex={firstItemIndex}
                        initialTopMostItemIndex={visibleLogs.length - 1}
                        followOutput={follow ? 'smooth' : false}
                        atBottomStateChange={(atBottom) => {
                            if (!atBottom) {
                                setFollow(false);
                            }
                        }}
                        itemContent={(_index, log) => (
                            <Box sx={{ px: 2 }} key={log.id}>
                                <LogEntry log={log} devices={devices} />
                            </Box>
                        )}
                    />
                )}
            </Paper>
        </Box>
    );
}