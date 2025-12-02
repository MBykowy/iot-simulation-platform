import { useAppStore } from '../stores/appStore';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box } from '@mui/material';

export function DataTableView() {
    const chartData = useAppStore((state) => state.chartData);

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
                        {chartData.slice().reverse().map((row, index) => ( // Odwracamy, aby najnowsze były na górze
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