import {Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from '@mui/material';
import type {ChartDataPoint} from '../stores/appStore';

interface DataTableViewProps {
    chartData: ChartDataPoint[];
}

export function DataTableView({ chartData }: DataTableViewProps) {

    const headers = Array.from(new Set(chartData.flatMap(row => Object.keys(row))));

    return (
        <Box sx={{ mt: 2, height: 450, overflow: 'hidden' }}>
            <TableContainer component={Paper} sx={{ maxHeight: '100%' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            {headers.map(header => (
                                <TableCell key={header} sx={{ fontWeight: 'bold' }}>{header}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {chartData.slice().reverse().map((row, index) => (
                            <TableRow key={index}>
                                {headers.map(header => (
                                    <TableCell key={header}>
                                        {header === 'time'
                                            ? new Date(row[header] as number).toLocaleString('en-GB')
                                            : String(row[header] ?? '')}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}