import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Client , type IMessage } from '@stomp/stompjs';

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

interface StompSubscription { unsubscribe: () => void; }

interface WebSocketContextType {
    subscribe: (destination: string, callback: (message: IMessage) => void) => StompSubscription | null;
    isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const clientRef = useRef<Client | null>(null);
    const [isConnected, setIsConnected] = useState(false); // Stan
    const pendingSubscriptionsRef = useRef<Array<() => void>>([]);

    if (!clientRef.current) {
        clientRef.current = new Client({
            brokerURL: WS_URL,
            reconnectDelay: 5000,

            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,

            onConnect: () => {
                console.log('>>> Global WebSocket Client Connected');
                setIsConnected(true);
                pendingSubscriptionsRef.current.forEach(subscribeFunc => subscribeFunc());
                pendingSubscriptionsRef.current = [];
            },
            onWebSocketClose: () => {
                console.log('>>> WebSocket Closed');
                setIsConnected(false);
            },
            onStompError: (frame) => {
                console.error('>>> Broker reported error: ' + frame.headers['message']);
                setIsConnected(false);
            },
        });
    }

    useEffect(() => {
        const client = clientRef.current;
        if (client && !client.active) {
            client.activate();
        }
        return () => {
            client?.deactivate();
        };
    }, []);

    const subscribe = (destination: string, callback: (message: IMessage) => void): StompSubscription | null => {
        const client = clientRef.current;
        if (!client) return null;
        let subscription: any = null;
        const subscribeAction = () => {
            console.log(`Subscribing to ${destination}`);
            subscription = client.subscribe(destination, callback);
        };
        if (client.connected) {
            subscribeAction();
        } else {
            pendingSubscriptionsRef.current.push(subscribeAction);
        }
        return {
            unsubscribe: () => {
                subscription?.unsubscribe();
                console.log(`Unsubscribed from ${destination}`);
            }
        };
    };

    return (
        <WebSocketContext.Provider value={{ subscribe, isConnected }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocketSubscription = () => {
    return useContext(WebSocketContext);
};