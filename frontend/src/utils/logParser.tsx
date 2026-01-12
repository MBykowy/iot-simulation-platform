/* eslint-disable react-refresh/only-export-components */
import {Box, Typography} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RuleIcon from '@mui/icons-material/Rule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UpdateIcon from '@mui/icons-material/Update';
import StorageIcon from '@mui/icons-material/Storage';

const RADIX = 10;
export const OPACITY_DEFAULT = 1;
const OPACITY_DIMMED = 0.5;
const OPACITY_INFLUX = 0.7;

const patterns = {
    EVENT_CHAIN: /SIM ENGINE: Starting event chain for device: (.*)/,
    RULES_FOUND: /SIM ENGINE \(Depth \d+\): Found (\d+) relevant rules./,
    CONDITION_MET: /SIM ENGINE \(Depth \d+\): Condition met for rule '(.*)'. Executing action./,
    UPDATING: /SIM ENGINE: Updating device (.*) with new state: (.*)/,
    INFLUX_WRITE: /INFLUXDB: Wrote data for device (.*)/,
    FLUX_QUERY: /Executing Flux query:\n([\s\S]*)/,
};

export interface ParsedLogContent {
    content: React.ReactNode;
    icon: React.ReactNode;
    details: React.ReactNode;
    isExpandable: boolean;
    opacity: number;
}

interface HighlightProps {
    readonly children: React.ReactNode;
    readonly color?: string;
    readonly isName?: boolean;
}

const Highlight = ({children, color = 'text.primary', isName = false}: HighlightProps) => {
    let actualColor = color;
    let fontWeight = 500;
    let bgcolor = 'transparent';
    let px = 0;

    if (isName) {
        actualColor = 'primary.main';
        fontWeight = 600;
        bgcolor = 'rgba(96, 165, 250, 0.08)';
        px = 0.5;
    }

    return (
        <Typography
            component="span"
            sx={{
                color: actualColor,
                fontWeight,
                fontSize: '0.85rem',
                bgcolor,
                px,
                borderRadius: 1,
            }}
        >
            {children}
        </Typography>
    );
};

const processMessageWithNames = (message: string, deviceNameMap: Map<string, string>): React.ReactNode => {
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match = uuidRegex.exec(message);

    while (match !== null) {
        if (match.index > lastIndex) {
            parts.push(message.substring(lastIndex, match.index));
        }
        const uuid = match[0];
        const name = deviceNameMap.get(uuid);
        const displayText = name ? name : `${uuid.substring(0, 8)}...`;

        parts.push(
            <Highlight key={match.index} isName>
                {displayText}
            </Highlight>,
        );
        lastIndex = uuidRegex.lastIndex;
        match = uuidRegex.exec(message);
    }

    if (lastIndex < message.length) {
        parts.push(message.substring(lastIndex));
    }
    return <>{parts}</>;
};

type LogHandler = (match: RegExpMatchArray, deviceNameMap: Map<string, string>) => ParsedLogContent;

const getEventChainContent: LogHandler = (match, deviceNameMap) => ({
    icon: <PlayArrowIcon fontSize="small" color="info"/>,
    content: <>Event Chain Start: <Highlight isName>{deviceNameMap.get(match[1]) ?? match[1]}</Highlight></>,
    details: null,
    isExpandable: false,
    opacity: OPACITY_DEFAULT,
});

const getRulesFoundContent: LogHandler = (match) => {
    const count = Number.parseInt(match[1], RADIX);
    const color = count > 0 ? 'info' : 'disabled';
    const opacity = count > 0 ? OPACITY_DEFAULT : OPACITY_DIMMED;

    return {
        icon: <RuleIcon fontSize="small" color={color}/>,
        content: <>{count} relevant rule(s) found</>,
        details: null,
        isExpandable: false,
        opacity,
    };
};

const getConditionMetContent: LogHandler = (match) => ({
    icon: <CheckCircleIcon fontSize="small" color="success"/>,
    content: <>Rule <Highlight color="success.main">&quot;{match[1]}&quot;</Highlight> triggered</>,
    details: null,
    isExpandable: false,
    opacity: OPACITY_DEFAULT,
});

const getUpdatingContent: LogHandler = (match, deviceNameMap) => {
    let details: React.ReactNode;
    try {
        details = <pre style={{margin: 0}}>{JSON.stringify(JSON.parse(match[2]), null, 2)}</pre>;
    } catch {
        details = <pre style={{margin: 0}}>{match[2]}</pre>;
    }

    return {
        icon: <UpdateIcon fontSize="small" color="warning"/>,
        content: <>Updating device: <Highlight isName>{deviceNameMap.get(match[1]) ?? match[1]}</Highlight></>,
        details,
        isExpandable: true,
        opacity: OPACITY_DEFAULT,
    };
};

const getInfluxWriteContent: LogHandler = (match, deviceNameMap) => ({
    icon: <StorageIcon fontSize="small" color="action"/>,
    content: <>Saved to DB: <Highlight isName>{deviceNameMap.get(match[1]) ?? match[1]}</Highlight></>,
    details: null,
    isExpandable: false,
    opacity: OPACITY_INFLUX,
});

const getFluxQueryContent: LogHandler = (match) => ({
    icon: (
        <Box sx={{
            fontSize: '0.7rem',
            fontWeight: 'bold',
            color: 'text.disabled',
            border: '1px solid',
            borderRadius: 0.5,
            px: 0.5
        }}>
            FLUX
        </Box>
    ),
    content: <Typography variant="body2" color="text.secondary">Aggregation Query Executed</Typography>,
    details: <pre style={{margin: 0, whiteSpace: 'pre-wrap', color: '#a78bfa'}}>{match[1].trim()}</pre>,
    isExpandable: true,
    opacity: OPACITY_DEFAULT,
});


const logHandlers: { regex: RegExp, handler: LogHandler }[] = [
    {regex: patterns.EVENT_CHAIN, handler: getEventChainContent},
    {regex: patterns.RULES_FOUND, handler: getRulesFoundContent},
    {regex: patterns.CONDITION_MET, handler: getConditionMetContent},
    {regex: patterns.UPDATING, handler: getUpdatingContent},
    {regex: patterns.INFLUX_WRITE, handler: getInfluxWriteContent},
    {regex: patterns.FLUX_QUERY, handler: getFluxQueryContent},
];


export function parseLogMessage(message: string, deviceNameMap: Map<string, string>): ParsedLogContent {


    for (const {regex, handler} of logHandlers) {
        const match = regex.exec(message);
        if (match) {
            return handler(match, deviceNameMap);
        }
    }

    return {
        content: processMessageWithNames(message, deviceNameMap),
        icon: null,
        details: null,
        isExpandable: false,
        opacity: OPACITY_DEFAULT,
    };
}