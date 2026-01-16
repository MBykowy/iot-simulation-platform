import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Client,
    type IMessage,
    type StompSubscription as LibStompSubscription,
} from '@stomp/stompjs';

let protocol = 'ws:';
if (globalThis.location.protocol === 'https:') {
    protocol = 'wss:';
}
const WS_URL = `${protocol}//${globalThis.location.host}/ws`;

interface StompSubscription {
    unsubscribe: () => void;
}

interface WebSocketContextType {
    subscribe: (
        destination: string,
        callback: (message: IMessage) => void,
    ) => StompSubscription | null;
    isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const clientRef = useRef<Client | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const pendingSubscriptionsRef = useRef<Array<() => void>>([]);

    if (!clientRef.current) {
        clientRef.current = new Client({
            brokerURL: WS_URL,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                setIsConnected(true);
                pendingSubscriptionsRef.current.forEach((subscribeFunc) => {
                    subscribeFunc();
                });
                pendingSubscriptionsRef.current = [];
            },
            onWebSocketClose: () => setIsConnected(false),
            onStompError: () => setIsConnected(false),
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

    const subscribe = useCallback(
        (
            destination: string,
            callback: (message: IMessage) => void,
        ): StompSubscription | null => {
            const client = clientRef.current;
            if (!client) {
                return null;
            }
            let subscription: LibStompSubscription | null = null;
            const subscribeAction = () => {
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
                },
            };
        },
        [],
    );

    const contextValue = useMemo(
        () => ({ subscribe, isConnected }),
        [subscribe, isConnected],
    );

    return (
        <WebSocketContext.Provider value={contextValue}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocketSubscription = () => {
    return useContext(WebSocketContext);
};