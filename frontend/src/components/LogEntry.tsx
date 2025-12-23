import { useState, memo } from 'react'; // Usunięto useMemo z importów
import { Box, Typography, Chip, Collapse, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RuleIcon from '@mui/icons-material/Rule';
import StorageIcon from '@mui/icons-material/Storage';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UpdateIcon from '@mui/icons-material/Update';
import type { LogMessage } from '../types';

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

const formatNumber = (val: string) => {
    const num = parseFloat(val);
    return isNaN(num) ? val : num.toFixed(2);
};

const getOperatorSymbol = (op: string) => {
    switch(op.trim()) {
        case 'GREATER_THAN': return '>';
        case 'LESS_THAN': return '<';
        case 'EQUALS': return '=';
        default: return op;
    }
};

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
                {name ? name : uuid.substring(0, 8) + '...'}
            </Highlight>
        );
        lastIndex = uuidRegex.lastIndex;
    }
    if (lastIndex < message.length) {
        parts.push(message.substring(lastIndex));
    }
    return <>{parts}</>;
};

function LogEntryComponent({ log, deviceNameMap }: { log: LogMessage, deviceNameMap: Map<string, string> }) {

    const [expanded, setExpanded] = useState(false);

    let content: React.ReactNode = null;
    let icon: React.ReactNode = null;
    let isExpandable = false;
    let details: React.ReactNode = null;
    let opacity = 1;

    let match;
    if ((match = log.message.match(patterns.COMPARING))) {
        const actual = formatNumber(match[1]);
        const operator = getOperatorSymbol(match[2]);
        const expected = formatNumber(match[3]);

        let result = false;
        try {
            if (match[2] === 'GREATER_THAN') result = parseFloat(match[1]) > parseFloat(match[3]);
            if (match[2] === 'LESS_THAN') result = parseFloat(match[1]) < parseFloat(match[3]);
            if (match[2] === 'EQUALS') result = parseFloat(match[1]) == parseFloat(match[3]);
        } catch { /* ignore */ }

        icon = <CompareArrowsIcon fontSize="small" color={result ? "success" : "disabled"} />;
        content = (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">Check:</Typography>
                <Highlight>{actual}</Highlight>
                <Highlight color="secondary.main">{operator}</Highlight>
                <Highlight>{expected}</Highlight>
                <Chip label={result ? "TRUE" : "FALSE"} color={result ? "success" : "default"} size="small" sx={{ height: 20, fontSize: '0.65rem' }} variant="outlined" />
            </Box>
        );
        opacity = 0.8;
    }
    else if ((match = log.message.match(patterns.EVENT_CHAIN))) {
        icon = <PlayArrowIcon fontSize="small" color="info" />;
        content = <>Event Chain Start: <Highlight isName>{deviceNameMap.get(match[1]) || match[1]}</Highlight></>;
    }
    else if ((match = log.message.match(patterns.RULES_FOUND))) {
        const count = parseInt(match[2]);
        icon = <RuleIcon fontSize="small" color={count > 0 ? "info" : "disabled"} />;
        content = <>{count} rules found (Depth {match[1]})</>;
        if (count === 0) opacity = 0.4;
    }
    else if ((match = log.message.match(patterns.CONDITION_MET))) {
        icon = <CheckCircleIcon fontSize="small" color="success" />;
        content = <>Rule <Highlight color="success.main">"{match[2]}"</Highlight> triggered</>;
    }
    else if ((match = log.message.match(patterns.UPDATING))) {
        icon = <UpdateIcon fontSize="small" color="warning" />;
        const state = match[2];
        content = <>Update <Highlight isName>{deviceNameMap.get(match[1]) || match[1]}</Highlight></>;
        isExpandable = true;
        details = <pre style={{ margin: 0 }}>{JSON.stringify(JSON.parse(state), null, 2)}</pre>;
    }
    else if ((match = log.message.match(patterns.INFLUX_WRITE))) {
        icon = <StorageIcon fontSize="small" color="action" />;
        content = <>Saved to DB: <Highlight isName>{deviceNameMap.get(match[1]) || match[1]}</Highlight></>;
        opacity = 0.6;
    }
    else if ((match = log.message.match(patterns.FLUX_QUERY))) {
        icon = <Box sx={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'text.disabled', border: '1px solid', borderRadius: 0.5, px: 0.5 }}>FLUX</Box>;
        content = <Typography variant="body2" color="text.secondary">Aggregation Query Executed</Typography>;
        isExpandable = true;
        details = <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#a78bfa' }}>{match[1].trim()}</pre>;
    }
    else {
        content = processMessageWithNames(log.message, deviceNameMap);
    }

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            mb: 0.5,
            opacity: opacity,
            '&:hover': { opacity: 1, bgcolor: 'rgba(255,255,255,0.02)' },
            borderRadius: 1,
            transition: 'opacity 0.2s'
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.2 }}>
                <Typography variant="caption" color="text.disabled" sx={{ minWidth: 90, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                    {new Date(log.timestamp).toLocaleTimeString('en-GB', { hour12: false })}.{String(new Date(log.timestamp).getMilliseconds()).padStart(3, '0')}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}>
                    {icon}
                </Box>

                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                    <Typography variant="body2" component="div" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {content}
                    </Typography>
                </Box>

                {isExpandable && (
                    <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ p: 0.5 }}>
                        {expanded ? <ExpandMoreIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                    </IconButton>
                )}
            </Box>

            <Collapse in={expanded}>
                <Box sx={{ ml: 14, mr: 2, mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    {details}
                </Box>
            </Collapse>
        </Box>
    );
}

export const LogEntry = memo(LogEntryComponent);