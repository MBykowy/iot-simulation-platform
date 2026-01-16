import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useChart } from './useChart';
import { useAppStore } from '../stores/appStore';

// Mock store
vi.mock('../stores/appStore', () => ({
    useAppStore: vi.fn(),
}));

describe('useChart', () => {
    const mockShowSnackbar = vi.fn();

    beforeEach(() => {
        vi.mocked(useAppStore).mockReturnValue(mockShowSnackbar);
        globalThis.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should fetch and format history data', async () => {
        const mockData = [
            { _time: '2023-01-01T10:00:00Z', temp: 20 },
            { _time: '2023-01-01T10:05:00Z', temp: 25 },
        ];

        (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => mockData,
        });

        const { result } = renderHook(() => useChart('device-123'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.chartData).toHaveLength(2);
        expect(result.current.chartData[0].time).toBe(new Date('2023-01-01T10:00:00Z').getTime());
        expect(result.current.chartData[0]).toHaveProperty('temp', 20);
    });

    it('should handle live updates via appendDataPoint', async () => {
        const { result } = renderHook(() => useChart('device-123'));

        // wait for initial fetch
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.chartData).toEqual([]);

        await act(async () => {
            result.current.appendDataPoint({
                id: 'device-123',
                name: 'Test',
                type: 'VIRTUAL',
                role: 'SENSOR',
                currentState: '{"temp": 30, "hum": 50}',
                simulationActive: false,
                simulationConfig: null
            });
        });

        expect(result.current.chartData).toHaveLength(1);
    });

    it('should ignore live updates for different devices', async () => {
        const { result } = renderHook(() => useChart('device-A'));

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            result.current.appendDataPoint({
                id: 'device-B',
                name: 'Test',
                type: 'VIRTUAL',
                role: 'SENSOR',
                currentState: '{"temp": 30}',
                simulationActive: false,
                simulationConfig: null
            });
        });

        expect(result.current.chartData).toHaveLength(0);
    });
});