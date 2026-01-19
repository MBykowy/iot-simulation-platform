export enum DeviceType {
    VIRTUAL = 'VIRTUAL',
    PHYSICAL = 'PHYSICAL',
}

export enum DeviceRole {
    SENSOR = 'SENSOR',
    ACTUATOR = 'ACTUATOR',
}

export enum RuleOperator {
    EQUALS = 'EQUALS',
    GREATER_THAN = 'GREATER_THAN',
    LESS_THAN = 'LESS_THAN',
    NOT_EQUALS = 'NOT_EQUALS',
}

export enum AggregateFunction {
    MEAN = 'MEAN',
    MAX = 'MAX',
    MIN = 'MIN',
    SUM = 'SUM',
    COUNT = 'COUNT',
}

export enum LogLevel {
    TRACE = 'TRACE',
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
}

export enum SimulationPattern {
    SINE = 'SINE',
    RANDOM = 'RANDOM',
}

export enum CommandMode {
    PRESET = 'PRESET',
    JSON = 'JSON',
}

// Domain
export interface Device {
    id: string;
    name: string;
    type: DeviceType;
    role: DeviceRole;
    currentState: string;
    simulationActive: boolean;
    simulationConfig: string | null;
    online: boolean;
}

export interface LogMessage {
    id: number;
    timestamp: string;
    level: LogLevel;
    loggerName: string;
    message: string;
}

export interface Rule {
    id: string;
    name: string;
    triggerConfig: string; //  JSON
    actionConfig: string;  //  JSON
    active: boolean;
}

// DTO
export interface DeviceRequest {
    name: string;
    type: DeviceType;
    role: DeviceRole;
}

export interface UpdateDeviceRequest {
    name: string;
}

export interface RuleRequest {
    name: string;
    triggerConfig: RuleTriggerConfig;
    actionConfig: RuleActionConfig;
}

export interface RuleTriggerConfig {
    deviceId: string;
    path?: string;
    aggregate?: AggregateFunction;
    field?: string;
    range?: string;
    operator: RuleOperator;
    value: string;
}

export interface RuleActionConfig {
    deviceId: string;
    newState: Record<string, unknown>;
}

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

// influx
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
export enum ApiEndpoint {
    DEVICES = '/api/devices',
    RULES = '/api/rules',
    EVENTS = '/api/events',
    LOGS_HISTORY = '/api/logs/history',
    HEALTH = '/api/health',
}