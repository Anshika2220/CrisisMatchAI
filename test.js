const axios = require('axios');

const test = async () => {
    try {
        console.log("Adding Volunteer...");
        const vRes = await axios.post('http://localhost:5000/api/volunteers', {
            name: "Alice Smith",
            location: { lat: 40.7128, lng: -74.0060 },
            skills: ["First Aid", "Driving"]
        });
        const volunteerId = vRes.data.id;
        console.log("Volunteer added:", vRes.data);

        console.log("\nAdding Task...");
        const tRes = await axios.post('http://localhost:5000/api/tasks', {
            title: "Medical Emergency",
            description: "Someone needs first aid immediately.",
            location: { lat: 40.7130, lng: -74.0065 },
            urgencyScore: 5,
            requiredSkills: ["First Aid"]
        });
        const taskId = tRes.data.id;
        console.log("Task added:", tRes.data);

        console.log("\nAssigning Task...");
        const aRes = await axios.post(`http://localhost:5000/api/tasks/${taskId}/assign`);
        console.log("Assignment Result:", aRes.data);

        console.log("\nGetting Hotspots...");
        const hRes = await axios.get('http://localhost:5000/api/analytics/demand');
        console.log("Hotspots:", hRes.data);
    } catch(err) {
        console.error("Test failed:", err.response ? err.response.data : err.message);
    }
}
test();
