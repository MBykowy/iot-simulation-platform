import { Box, Typography, Chip, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useMemo } from 'react';
import type { Device } from '../types';

interface LogMessage {
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    loggerName: string;
    message: string;
}

const levelColors = {
    INFO: 'primary',
    WARN: 'warning',
    ERROR: 'error',
} as const;

const patterns = {
    COMPARING: /SIM ENGINE: Comparing - Actual: (.*), Operator: (.*), Expected: (.*)/,
    EVENT_CHAIN: /SIM ENGINE: Starting event chain for device: (.*)/,
    PROCESSING: /SIM ENGINE \(Depth (\d+)\): Processing event for device: (.*)/,
    RULES_FOUND: /SIM ENGINE \(Depth (\d+)\): Found (\d+) relevant rules./,
    CONDITION_MET: /SIM ENGINE \(Depth (\d+)\): Condition met for rule '(.*)'. Executing action./,
    UPDATING: /SIM ENGINE: Updating device (.*) with new state: (.*)/,
    INFLUX_WRITE: /INFLUXDB: Wrote data for device (.*)/,
    FLUX_QUERY: /Executing Flux query:\n([\s\S]*)/,
};

const Highlight = ({ children, color = 'secondary.main', isName = false }: { children: React.ReactNode, color?: string, isName?: boolean }) => (
    <Typography component="span" sx={{
        color: isName ? 'primary.light' : color,
        fontWeight: 'bold',
        bgcolor: isName ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
        px: isName ? 0.5 : 0,
        borderRadius: 1,
    }}>
        {children}
    </Typography>
);

const processMessageWithNames = (message: string, deviceNameMap: Map<string, string>): React.ReactNode => {
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    const parts = [];
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
                {name ? name : uuid}
            </Highlight>
        );
        lastIndex = uuidRegex.lastIndex;
    }

    if (lastIndex < message.length) {
        parts.push(message.substring(lastIndex));
    }

    return <>{parts}</>;
};


export function LogEntry({ log, devices }: { log: LogMessage, devices: Device[] }) {
    const deviceNameMap = useMemo(() => new Map(devices.map(d => [d.id, d.name])), [devices]);

    let content: React.ReactNode = processMessageWithNames(log.message, deviceNameMap);
    let match;
    if ((match = log.message.match(patterns.COMPARING))) {
        content = <><Highlight color="info.light">{match[2]}</Highlight>: Actual <Highlight>{match[1]}</Highlight> vs Expected <Highlight>{match[3]}</Highlight></>;
    } else if ((match = log.message.match(patterns.EVENT_CHAIN))) {
        content = <>Starting event chain for device <Highlight>{match[1]}</Highlight></>;
    } else if ((match = log.message.match(patterns.PROCESSING))) {
        content = <>Processing event (Depth: {match[1]}) for <Highlight>{match[2]}</Highlight></>;
    } else if ((match = log.message.match(patterns.RULES_FOUND))) {
        content = <>Found <Highlight>{match[2]}</Highlight> relevant rules (Depth: {match[1]})</>;
    } else if ((match = log.message.match(patterns.CONDITION_MET))) {
        content = <>✅ Condition met for rule <Highlight color="success.light">"{match[2]}"</Highlight> (Depth: {match[1]})</>;
    } else if ((match = log.message.match(patterns.UPDATING))) {
        content = <>Updating device <Highlight>{match[1]}</Highlight> with state <Highlight color="warning.light">{match[2]}</Highlight></>;
    } else if ((match = log.message.match(patterns.INFLUX_WRITE))) {
        content = <>InfluxDB write for device <Highlight>{match[1]}</Highlight></>;
    } else if ((match = log.message.match(patterns.FLUX_QUERY))) {
        content = (
            <Accordion sx={{ boxShadow: 'none', bgcolor: 'transparent', '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ p: 0, minHeight: 0, '& .MuiAccordionSummary-content': { m: 0 } }}>
                    <Typography>InfluxDB Flux Query</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}><code>{match[1].trim()}</code></pre>
                </AccordionDetails>
            </Accordion>
        );
    }

    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1, gap: 2, py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120, pt: '4px' }}>
                {new Date(log.timestamp).toLocaleTimeString('en-GB', { hour12: false })}.{String(new Date(log.timestamp).getMilliseconds()).padStart(3, '0')}
            </Typography>
            <Chip label={log.level} color={levelColors[log.level]} size="small" sx={{ minWidth: 70 }} />
            <Typography component="div" sx={{ wordBreak: 'break-all', flexGrow: 1, pt: '2px' }}>{content}</Typography>
        </Box>
    );
}