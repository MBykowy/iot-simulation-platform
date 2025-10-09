import { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import './App.css';

interface Device {
    id: string;
    name: string;
    type: string;
    currentState: string;
}

const API_URL = 'http://localhost:8081'; // Upewnij się, że port jest poprawny

function App() {
    const [devices, setDevices] = useState<Device[]>([]);
    const clientRef = useRef<Client | null>(null);

    useEffect(() => {
        fetch(`${API_URL}/api/devices`)
            .then(response => response.json())
            .then(data => setDevices(data))
            .catch(error => console.error('Error fetching initial devices:', error));
    }, []);

    useEffect(() => {
        if (!clientRef.current) {
            console.log("Creating new STOMP client instance.");
            const client = new Client({
                brokerURL: `ws://localhost:8081/ws`, // <-- DODAJ TĘ LINIĘ
                debug: (str) => {
                    console.log('STOMP: ' + str);
                },
                reconnectDelay: 5000,
            });

            client.onConnect = () => {
                console.log('>>> SUCCESS: Connected to WebSocket!');
                client.subscribe('/topic/devices', (message) => {
                    const updatedDevice: Device = JSON.parse(message.body);

                    setDevices(prevDevices => {
                        const existing = prevDevices.find(d => d.id === updatedDevice.id);
                        if (existing) {
                            return prevDevices.map(d => d.id === updatedDevice.id ? updatedDevice : d);
                        }
                        return [...prevDevices, updatedDevice];
                    });
                });
            };

            client.onStompError = (frame) => {
                console.error('Broker reported error:', frame.headers['message']);
            };

            clientRef.current = client;
        }

        if (clientRef.current.active) {
            console.log("Client is already active.");
        } else {
            console.log("Activating STOMP client...");
            clientRef.current.activate();
        }

        return () => {
            console.log("Deactivating STOMP client on component unmount.");
            if (clientRef.current?.active) {
                clientRef.current.deactivate();
            }
        };
    }, []);

    return (
        <>
            <h1>IoT Simulation Platform</h1>
            <div className="card">
                <h2>Registered Devices (Live)</h2>
                {devices.length > 0 ? (
                    <ul>
                        {devices.map(device => (
                            <li key={device.id}>
                                <strong>{device.name} ({device.id})</strong> - State: {device.currentState}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No devices found. Waiting for events...</p>
                )}
            </div>
        </>
    );
}

export default App;