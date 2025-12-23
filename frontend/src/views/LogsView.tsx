import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useWebSocketSubscription } from '../contexts/WebSocketProvider';
import { Box, Paper, Chip, Switch, FormControlLabel, CircularProgress, Grid, TextField, FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip } from '@mui/material';
import { LogEntry } from '../components/LogEntry';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { useAppStore } from "../stores/appStore.tsx";

import type { Device, InfluxLogRecord, LogLevel, LogMessage } from "../types.ts";

import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

import { useLogStream } from '../hooks/useLogStream';

const API_URL = '';

const influxToLogMessage = (influxRecord: InfluxLogRecord): Omit<LogMessage, 'id'> => ({
    timestamp: influxRecord._time,
    level: influxRecord.level,
    loggerName: influxRecord.loggerName,
    message: influxRecord.message,
});

const levelColors: Record<LogLevel, "primary" | "warning" | "error" | "info" | "default" | "secondary" | "success"> = {
    INFO: 'primary',
    WARN: 'warning',
    ERROR: 'error',
    DEBUG: 'info',
    TRACE: 'default'
};



export function LogsView() {
    const devices = useAppStore(state => state.devices);
    const fetchDevices = useAppStore(state => state.fetchDevices);

    const subscriptionManager = useWebSocketSubscription();
    const { logs, setLogs } = useLogStream(subscriptionManager);

    const [isLoading, setIsLoading] = useState(true);
    const [filterLevels, setFilterLevels] = useState<Record<LogLevel, boolean>>({
        INFO: true,
        WARN: true,
        ERROR: true,
        DEBUG: false,
        TRACE: false
    });
    const [searchText, setSearchText] = useState('');
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [follow, setFollow] = useState(true);

    const virtuosoRef = useRef<VirtuosoHandle>(null);

    const deviceNameMap = useMemo(() => {
        return new Map(devices.map(d => [d.id, d.name]));
    }, [devices]);

    useEffect(() => {
        if (!devices.length) fetchDevices();

        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${API_URL}/api/logs/history?range=1h`);
                if (!response.ok) throw new Error('Failed to fetch log history');

                const data = await response.json() as InfluxLogRecord[];

                const historicalLogs = data.map((item, index) => ({
                    ...influxToLogMessage(item),
                    id: index - data.length  //ujemne żeby nie przeszkadzały live
                }));

                setLogs(historicalLogs);
                setTimeout(() => {
                    virtuosoRef.current?.scrollToIndex({ index: historicalLogs.length - 1, align: 'end' });
                }, 100);

            } catch (err) {
                console.error("Failed to fetch log history", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, [devices.length, fetchDevices, setLogs]);


    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            if (log.message.includes("Processing event")) return false;

            const levelMatch = filterLevels[log.level];
            const textMatch = searchText === '' || log.message.toLowerCase().includes(searchText.toLowerCase());
            const deviceMatch = selectedDeviceId === '' || log.message.includes(selectedDeviceId);
            return levelMatch && textMatch && deviceMatch;
        });
    }, [logs, filterLevels, searchText, selectedDeviceId]);

    const handleScrollToBottom = useCallback(() => {
        setFollow(true);
        virtuosoRef.current?.scrollToIndex({
            index: filteredLogs.length - 1,
            align: 'end',
            behavior: 'smooth',
        });
    }, [filteredLogs.length]);

    return (
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', boxSizing: 'border-box' }}>
            <Paper sx={{ p: 2, mb: 2, flexShrink: 0 }}>
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
                        <Tooltip title={subscriptionManager?.isConnected ? "Connected" : "Disconnected"}>
                            <IconButton color={subscriptionManager?.isConnected ? 'success' : 'error'}>
                                {subscriptionManager?.isConnected ? <WifiIcon /> : <WifiOffIcon />}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Scroll to Bottom">
                            <IconButton onClick={handleScrollToBottom}>
                                <ArrowDownwardIcon />
                            </IconButton>
                        </Tooltip>
                        <FormControlLabel
                            control={<Switch checked={follow} onChange={(e) => {
                                if (e.target.checked) handleScrollToBottom();
                                else setFollow(false);
                            }} />}
                            label="Follow logs"
                        />
                        {(Object.keys(filterLevels) as LogLevel[]).map(level => (
                            <Chip key={level} label={level}  color={levelColors[level as keyof typeof levelColors]} size="small"
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
                        data={filteredLogs}
                        followOutput={follow ? 'auto' : false}
                        atBottomStateChange={(isAtBottom) => {
                            if (!isAtBottom) {
                                setFollow(false);
                            } else {
                                setFollow(true);
                            }
                        }}
                        atBottomThreshold={50}
                        alignToBottom={true}
                        itemContent={(_index, log) => (
                            <Box sx={{ px: 2, py: 0 }} key={log.id}>
                                <LogEntry log={log} deviceNameMap={deviceNameMap} />
                            </Box>
                        )}
                    />
                )}
            </Paper>
        </Box>
    );
}