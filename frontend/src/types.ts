
export interface Device {
    id: string;
    name: string;
    type: string;
    ioType: string;
    currentState: string;
    simulationActive: boolean;
    simulationConfig: string | null;
}