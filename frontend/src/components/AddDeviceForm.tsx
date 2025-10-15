import React, { useState } from 'react';

const API_URL = 'http://localhost:8081';

export function AddDeviceForm() {
    const [name, setName] = useState('');
    const [ioType, setIoType] = useState('SENSOR');

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        const newDevice = {
            name,
            type: 'VIRTUAL', // Na razie tworzymy tylko urządzenia wirtualne
            ioType,
        };

        fetch(`${API_URL}/api/devices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newDevice),
        })
            .then(response => {
                if (!response.ok) { throw new Error('Failed to create device'); }
                // Po sukcesie czyścimy pola formularza
                setName('');
                setIoType('SENSOR');
            })
            .catch(error => console.error('Error creating device:', error));
    };

    return (
        <form onSubmit={handleSubmit}>
            <h3>Add Virtual Device</h3>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Device Name"
                required
            />
            <select value={ioType} onChange={(e) => setIoType(e.target.value)}>
                <option value="SENSOR">Sensor</option>
                <option value="ACTUATOR">Actuator</option>
            </select>
            <button type="submit">Add Device</button>
        </form>
    );
}