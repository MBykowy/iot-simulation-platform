import { useEffect, useRef } from 'react';
import { Client, type IMessage } from '@stomp/stompjs';
import { useAppStore } from '../stores/appStore';
import type { Device } from '../types';

const WS_URL = 'http://localhost:8081'.replace(/^http/, 'ws') + '/ws';

export function useWebSocket() {
    const clientRef = useRef<Client | null>(null);
    const { addOrUpdateDevice, appendChartData } = useAppStore();

    useEffect(() => {
        if (!clientRef.current) {
            const client = new Client({ brokerURL: WS_URL, reconnectDelay: 5000 });

            client.onConnect = () => {
                console.log('>>> SUCCESS: Connected to WebSocket!');
                client.subscribe('/topic/devices', (message: IMessage) => {
                    try {
                        const updatedDevice: Device = JSON.parse(message.body);
                        addOrUpdateDevice(updatedDevice);
                        appendChartData(updatedDevice);
                    } catch (err) { console.error('Failed to parse STOMP message body:', err); }
                });
            };

            clientRef.current = client;
        }

        const client = clientRef.current;
        if (!client.active) client.activate();

    }, [addOrUpdateDevice, appendChartData]);
    return clientRef.current;
}