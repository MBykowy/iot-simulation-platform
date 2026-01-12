import { memo, useMemo, useState } from 'react';
import { Box, Collapse, IconButton, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import type { Device, LogMessage } from '../types';
import { parseLogMessage } from '../utils/logParser';

const TIMESTAMP_WIDTH_PX = 90;
const ICON_SIZE_PX = 24;
const INDENT_CALC_OFFSET_PX = 12;

interface LogEntryProps {
    readonly log: LogMessage;
    readonly devices: Device[];
}

function LogEntryComponent({ log, devices }: LogEntryProps) {
    const [expanded, setExpanded] = useState(false);

    const deviceNameMap = useMemo(() => new Map(devices.map((d) => [d.id, d.name])), [devices]);

    const { content, icon, details, isExpandable, opacity } = useMemo(
        () => parseLogMessage(log.message, deviceNameMap),
        [log.message, deviceNameMap]
    );

    const handleExpandClick = () => setExpanded(!expanded);

    const timestampDisplay = `${new Date(log.timestamp).toLocaleTimeString('en-GB', { hour12: false })}.${String(new Date(log.timestamp).getMilliseconds()).padStart(3, '0')}`;

    let expandIcon: React.ReactNode;
    if (expanded) {
        expandIcon = <ExpandMoreIcon fontSize="small" />;
    } else {
        expandIcon = <KeyboardArrowRightIcon fontSize="small" />;
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                opacity,
                '&:hover': { opacity: 1, bgcolor: 'rgba(255,255,255,0.02)' },
                borderRadius: 1,
                transition: 'opacity 0.2s, background-color 0.2s',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ minWidth: TIMESTAMP_WIDTH_PX, fontFamily: 'monospace', fontSize: '0.7rem' }}
                >
                    {timestampDisplay}
                </Typography>

                <Box sx={{ width: ICON_SIZE_PX, height: ICON_SIZE_PX, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {icon}
                </Box>

                <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                    <Typography
                        variant="body2"
                        component="div"
                        sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                        {content}
                    </Typography>
                </Box>

                {isExpandable && (
                    <IconButton size="small" onClick={handleExpandClick} sx={{ p: 0.5 }}>
                        {expandIcon}
                    </IconButton>
                )}
            </Box>

            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Box
                    sx={{
                        ml: `calc(${TIMESTAMP_WIDTH_PX}px + ${ICON_SIZE_PX}px + ${INDENT_CALC_OFFSET_PX}px)`,
                        mr: 2,
                        my: 0.5,
                        p: 1,
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                    }}
                >
                    {details}
                </Box>
            </Collapse>
        </Box>
    );
}

export const LogEntry = memo(LogEntryComponent);