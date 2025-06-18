const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
    console.log('Publisher connected');
    setInterval(() => {
        const machines = ['A1', 'A2', 'A3'];

        machines.forEach((machineId) => {
            const scrapIndex = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
            const value = Math.random() * 3; // Range: 0 to 3
            const payload = {
                machineId,
                scrapIndex,
                value,
                timestamp: new Date().toISOString(),
            };
            client.publish(
                `machines/${machineId}/scrap`,
                JSON.stringify(payload),
                () => console.log('Published:', payload)
            );
        });
    }, 10000);
});
