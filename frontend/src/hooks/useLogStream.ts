import { useEffect, useRef, useState } from 'react';
import type { IMessage } from '@stomp/stompjs';
import type { LogMessage } from '../types';

let logCounter = 0;
const MAX_LOGS = 1000;

interface Subscription {
    unsubscribe: () => void;
}

interface SubscriptionManager {
    subscribe: (
        destination: string,
        callback: (message: IMessage) => void,
    ) => Subscription | null;
}

export function useLogStream(subscriptionManager: SubscriptionManager | null) {
    const [logs, setLogs] = useState<LogMessage[]>([]);
    const bufferRef = useRef<LogMessage[]>([]);

    useEffect(() => {
        if (!subscriptionManager) return;

        const subscription = subscriptionManager.subscribe('/topic/logs', (message: IMessage) => {
            try {
                const rawLog = JSON.parse(message.body);
                const currentId = logCounter;
                logCounter += 1;

                const newLog: LogMessage = {
                    id: currentId,
                    timestamp: rawLog.timestamp,
                    level: rawLog.level,
                    loggerName: rawLog.loggerName,
                    message: rawLog.message,
                };
                bufferRef.current.push(newLog);
            } catch {
                // silent catch
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, [subscriptionManager]);

    useEffect(() => {
        let animationFrameId: number;

        const flushBuffer = () => {
            if (bufferRef.current.length > 0) {
                const incoming = [...bufferRef.current];
                bufferRef.current = [];

                setLogs((prevLogs) => {
                    const nextLogs = [...prevLogs, ...incoming];
                    if (nextLogs.length > MAX_LOGS) {
                        return nextLogs.slice(-MAX_LOGS);
                    }
                    return nextLogs;
                });
            }
            animationFrameId = requestAnimationFrame(flushBuffer);
        };

        animationFrameId = requestAnimationFrame(flushBuffer);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return { logs, setLogs };
}