import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import type { ChartDataPoint } from '../stores/appStore';

interface DataTableViewProps {
    readonly chartData: ChartDataPoint[];
}

export function DataTableView({ chartData }: DataTableViewProps) {
    const headers = Array.from(new Set(chartData.flatMap((row) => Object.keys(row))));

    const renderCellContent = (header: string, row: ChartDataPoint) => {
        const value = row[header];
        if (header === 'time' && typeof value === 'number') {
            return new Date(value).toLocaleString('en-GB');
        }
        return String(value ?? '');
    };

    return (
        <Box sx={{ mt: 2, height: 450, overflow: 'hidden' }}>
            <TableContainer component={Paper} sx={{ maxHeight: '100%' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            {headers.map((header) => (
                                <TableCell key={header} sx={{ fontWeight: 'bold' }}>
                                    {header}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {chartData
                            .slice()
                            .reverse()
                            .map((row) => (
                                <TableRow key={row.time}>
                                    {headers.map((header) => (
                                        <TableCell key={`${row.time}-${header}`}>
                                            {renderCellContent(header, row)}
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