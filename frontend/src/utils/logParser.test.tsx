import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { parseLogMessage } from './logParser';

describe('logParser', () => {
    // Mock Device Map
    const deviceMap = new Map<string, string>();
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    deviceMap.set(uuid, 'Living Room Sensor');

    it('should parse EVENT_CHAIN log', () => {
        const message = `SIM ENGINE: Starting event chain for device: ${uuid}`;
        const result = parseLogMessage(message, deviceMap);

        render(<>{result.content}</>);

        expect(screen.getByText('Event Chain Start:')).toBeInTheDocument();
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
        expect(result.opacity).toBe(1);
    });

    it('should parse CONDITION_MET log', () => {
        const message = "SIM ENGINE (Depth 1): Condition met for rule 'Heat Check'. Executing action.";
        const result = parseLogMessage(message, deviceMap);

        render(<>{result.content}</>);

        expect(screen.getByText(/Rule/)).toBeInTheDocument();
        expect(screen.getByText(/Heat Check/)).toBeInTheDocument();
        expect(screen.getByText(/triggered/)).toBeInTheDocument();
    });

    it('should handle raw messages and resolve UUIDs', () => {
        const message = `Unknown Error in device ${uuid}`;
        const result = parseLogMessage(message, deviceMap);

        render(<>{result.content}</>);

        expect(screen.getByText('Unknown Error in device')).toBeInTheDocument();
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
        // no icon for generic log
        expect(result.icon).toBeNull();
    });

    it('should parse FLUX_QUERY and extract details', () => {
        const query = 'from(bucket: "test") |> range(start: -1h)';
        const message = `Executing Flux query:\n${query}`;
        const result = parseLogMessage(message, deviceMap);

        render(<>{result.details}</>);
        expect(screen.getByText(query)).toBeInTheDocument();
        render(<>{result.content}</>);
        expect(screen.getByText(/Aggregation Query Executed/)).toBeInTheDocument();
    });
});