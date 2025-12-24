import {memo, useMemo, useState} from 'react';
import {Box, Collapse, IconButton, Typography} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RuleIcon from '@mui/icons-material/Rule';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UpdateIcon from '@mui/icons-material/Update';
import type {Device, LogMessage} from '../types';

const patterns = {
    EVENT_CHAIN: /SIM ENGINE: Starting event chain for device: (.*)/,
    RULES_FOUND: /SIM ENGINE \(Depth \d+\): Found (\d+) relevant rules./,
    CONDITION_MET: /SIM ENGINE \(Depth \d+\): Condition met for rule '(.*)'. Executing action./,
    UPDATING: /SIM ENGINE: Updating device (.*) with new state: (.*)/,
    INFLUX_WRITE: /INFLUXDB: Wrote data for device (.*)/,
    FLUX_QUERY: /Executing Flux query:\n([\s\S]*)/,
    COMPARING: /SIM ENGINE: Comparing - Actual: (.*), Operator: (.*), Expected: (.*)/,
};

const Highlight = ({ children, color = 'text.primary', isName = false }: { children: React.ReactNode, color?: string, isName?: boolean }) => (
    <Typography component="span" sx={{
        color: isName ? 'primary.main' : color,
        fontWeight: isName ? 600 : 500,
        fontSize: '0.85rem',
        bgcolor: isName ? 'rgba(96, 165, 250, 0.08)' : 'transparent',
        px: isName ? 0.5 : 0,
        borderRadius: 1,
    }}>
        {children}
    </Typography>
);

const processMessageWithNames = (message: string, deviceNameMap: Map<string, string>): React.ReactNode => {
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = uuidRegex.exec(message)) !== null) {
        if (match.index > lastIndex) {
            parts.push(message.substring(lastIndex, match.index));
        }
        const uuid = match[0];
        const name = deviceNameMap.get(uuid);
        parts.push(
            <Highlight key={match.index} isName={true}>
                {name ? name : `${uuid.substring(0, 8)}...`}
            </Highlight>
        );
        lastIndex = uuidRegex.lastIndex;
    }

    if (lastIndex < message.length) {
        parts.push(message.substring(lastIndex));
    }
    return <>{parts}</>;
};

interface LogEntryProps {
    log: LogMessage;
    devices: Device[];
}

function LogEntryComponent({ log, devices }: LogEntryProps) {
    const [expanded, setExpanded] = useState(false);

    const deviceNameMap = useMemo(() => new Map(devices.map(d => [d.id, d.name])), [devices]);

    const parsedContent = useMemo(() => {
        let content: React.ReactNode = null;
        let icon: React.ReactNode = null;
        let details: React.ReactNode = null;
        let isExpandable = false;
        let opacity = 1;
        let match;

        if ((match = log.message.match(patterns.EVENT_CHAIN))) {
            icon = <PlayArrowIcon fontSize="small" color="info" />;
            content = <>Event Chain Start: <Highlight isName>{deviceNameMap.get(match[1]) || match[1]}</Highlight></>;
        } else if ((match = log.message.match(patterns.RULES_FOUND))) {
            const count = parseInt(match[2], 10);
            icon = <RuleIcon fontSize="small" color={count > 0 ? "info" : "disabled"} />;
            content = <>{count} relevant rule(s) found</>;
            if (count === 0) opacity = 0.5;
        } else if ((match = log.message.match(patterns.CONDITION_MET))) {
            icon = <CheckCircleIcon fontSize="small" color="success" />;
            content = <>Rule <Highlight color="success.main">"{match[1]}"</Highlight> triggered</>;
        } else if ((match = log.message.match(patterns.UPDATING))) {
            icon = <UpdateIcon fontSize="small" color="warning" />;
            content = <>Updating device: <Highlight isName>{deviceNameMap.get(match[1]) || match[1]}</Highlight></>;
            isExpandable = true;
            try {
                details = <pre style={{ margin: 0 }}>{JSON.stringify(JSON.parse(match[2]), null, 2)}</pre>;
            } catch { details = <pre style={{ margin: 0 }}>{match[2]}</pre>; }
        } else if ((match = log.message.match(patterns.INFLUX_WRITE))) {
            icon = <StorageIcon fontSize="small" color="action" />;
            content = <>Saved to DB: <Highlight isName>{deviceNameMap.get(match[1]) || match[1]}</Highlight></>;
            opacity = 0.7;
        } else if ((match = log.message.match(patterns.FLUX_QUERY))) {
            icon = <Box sx={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'text.disabled', border: '1px solid', borderRadius: 0.5, px: 0.5 }}>FLUX</Box>;
            content = <Typography variant="body2" color="text.secondary">Aggregation Query Executed</Typography>;
            isExpandable = true;
            details = <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#a78bfa' }}>{match[1].trim()}</pre>;
        } else {
            content = processMessageWithNames(log.message, deviceNameMap);
        }

        return { content, icon, details, isExpandable, opacity };
    }, [log.message, deviceNameMap]);


    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            opacity: parsedContent.opacity,
            '&:hover': { opacity: 1, bgcolor: 'rgba(255,255,255,0.02)' },
            borderRadius: 1,
            transition: 'opacity 0.2s, background-color 0.2s'
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="caption" color="text.disabled" sx={{ minWidth: 90, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                    {new Date(log.timestamp).toLocaleTimeString('en-GB', { hour12: false })}.{String(new Date(log.timestamp).getMilliseconds()).padStart(3, '0')}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
                    {parsedContent.icon}
                </Box>

                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                    <Typography variant="body2" component="div" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {parsedContent.content}
                    </Typography>
                </Box>

                {parsedContent.isExpandable && (
                    <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ p: 0.5 }}>
                        {expanded ? <ExpandMoreIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                    </IconButton>
                )}
            </Box>

            {parsedContent.isExpandable && (
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <Box sx={{ ml: `calc(90px + 24px + 12px)`, mr: 2, my: 0.5, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {parsedContent.details}
                    </Box>
                </Collapse>
            )}
        </Box>
    );
}

export const LogEntry = memo(LogEntryComponent);