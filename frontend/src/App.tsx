import { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import './App.css';
import {AddDeviceForm} from "./components/AddDeviceForm.tsx";

interface Device {
    id: string;
    name: string;
    type: string;
    ioType: string;
    currentState: string;
}

const API_URL = 'http://localhost:8081'; // Upewnij się, że port jest poprawny
const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws';

function App() {
    const [devices, setDevices] = useState<Device[]>([]);
    const clientRef = useRef<Client | null>(null);

    useEffect(() => {
        fetch(`${API_URL}/api/devices`)
            .then(response => response.json())
            .then(data => {
                setDevices(Array.isArray(data) ? data : [data]);
            })
            .catch(error => console.error('Error fetching initial devices:', error));
    }, []);

    useEffect(() => {
        if (!clientRef.current) {
            console.log("Creating new STOMP client instance.");
            const client = new Client({
                brokerURL: WS_URL,
                debug: (str) => {
                    console.log('STOMP: ' + str);
                },
                reconnectDelay: 5000,
            });

            client.onConnect = () => {
                console.log('>>> SUCCESS: Connected to WebSocket!');
                client.subscribe('/topic/devices', (message: any) => {
                    try {
                        const updatedDevice: Device = JSON.parse(message.body);

                        setDevices(prevDevices => {
                            // Zabezpieczenie: upewniamy się, że pracujemy na tablicy
                            const prevArr = Array.isArray(prevDevices) ? prevDevices : [];

                            const existing = prevArr.find(d => d.id === updatedDevice.id);
                            if (existing) {
                                return prevArr.map(d => d.id === updatedDevice.id ? updatedDevice : d);
                            }
                            return [...prevArr, updatedDevice];
                        });
                    } catch (err) {
                        console.error('Failed to parse STOMP message body:', err);
                    }
                });
            };

            client.onStompError = (frame) => {
                console.error('Broker reported error:', frame.headers?.message || frame);
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

            {/* DODAJEMY NOWĄ KARTĘ Z FORMULARZEM */}
            <div className="card">
                <AddDeviceForm />
            </div>

            <div className="card">
                <h2>Registered Devices (Live)</h2>
                {devices.length > 0 ? (
                    <ul>
                        {devices.map(device => (
                            <li key={device.id}>
                                <strong>{device.name} ({device.id})</strong> - Type: {device.ioType} - State: {device.currentState}
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




