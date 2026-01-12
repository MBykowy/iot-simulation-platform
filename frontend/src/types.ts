export type DeviceType = 'VIRTUAL' | 'PHYSICAL';
export type DeviceRole = 'SENSOR' | 'ACTUATOR';
export type RuleOperator = 'EQUALS' | 'GREATER_THAN' | 'LESS_THAN';
export type AggregateFunction = 'MEAN' | 'MAX' | 'MIN' | 'SUM' | 'COUNT';
export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface Device {
    id: string;
    name: string;
    type: DeviceType;
    role: DeviceRole;
    currentState: string;
    simulationActive: boolean;
    simulationConfig: string | null;
}

export interface LogMessage {
    id: number;
    timestamp: string;
    level: LogLevel;
    loggerName: string;
    message: string;
}

export interface InfluxSensorRecord {
    _time: string;
    result?: string;
    table?: number;
    deviceId?: string;
    [key: string]: string | number | undefined;
}

export interface InfluxLogRecord {
    _time: string;
    level: LogLevel;
    loggerName: string;
    message: string;
    result?: string;
    table?: number;
}
export type SimulationPattern = 'SINE' | 'RANDOM';

export interface SimulationFieldConfig {
    pattern: SimulationPattern;
    parameters: Record<string, number>;
}

export interface NetworkProfile {
    latencyMs: number;
    packetLossPercent: number;
}

export interface SimulationConfig {
    intervalMs: number;
    fields: Record<string, SimulationFieldConfig>;
    networkProfile?: NetworkProfile;
}