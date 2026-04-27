const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Helper to get db
const getDb = () => {
    try {
        return admin.firestore();
    } catch (e) {
        console.error("Firestore Access Error:", e.message);
        throw e;
    }
};

// In-memory fallback store (used when Firestore auth fails in local/dev)
const memoryStore = {
    tasks: [],
    volunteers: [],
};

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const isFirestoreUnauthenticated = (err) => {
    const msg = String(err?.message || "");
    return err?.code === 16 || msg.includes("UNAUTHENTICATED") || msg.includes("invalid authentication credentials");
};

// Helper: Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (loc1, loc2) => {
    if (!loc1 || !loc2 || loc1.lat === undefined || loc1.lng === undefined || loc2.lat === undefined || loc2.lng === undefined) {
        return Infinity;
    }
    const R = 6371; // Radius of the earth in km
    const dLat = (loc2.lat - loc1.lat) * (Math.PI / 180);
    const dLon = (loc2.lng - loc1.lng) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(loc1.lat * (Math.PI / 180)) * Math.cos(loc2.lat * (Math.PI / 180)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// 1. Add Volunteer
router.post('/volunteers', async (req, res) => {
    try {
        const { name, location, skills, availability } = req.body;
        if (!location || typeof location !== 'object' || location.lat === undefined || location.lng === undefined) {
            return res.status(400).json({ error: "Invalid location" });
        }
        const newVolunteer = {
            name: name || "Anonymous",
            location: { lat: parseFloat(location.lat), lng: parseFloat(location.lng) },
            skills: skills || [],
            availability: availability !== undefined ? availability : true,
            assignedTask: null,
            createdAt: new Date().toISOString()
        };
        try {
            const docRef = await getDb().collection('volunteers').add(newVolunteer);
            res.status(201).json({ id: docRef.id, ...newVolunteer });
        } catch (err) {
            if (!isFirestoreUnauthenticated(err)) throw err;
            const id = makeId();
            memoryStore.volunteers.push({ id, ...newVolunteer });
            res.status(201).json({ id, ...newVolunteer, _store: "memory" });
        }
    } catch (err) {
        console.error("Add Volunteer Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. Add Task
router.post('/tasks', async (req, res) => {
    try {
        const { title, description, location, urgencyScore, requiredSkills } = req.body;
        if (!location || typeof location !== 'object' || location.lat === undefined || location.lng === undefined) {
            return res.status(400).json({ error: "Invalid location" });
        }
        const newTask = {
            title: title || "Untitled Crisis",
            description: description || "",
            location: { lat: parseFloat(location.lat), lng: parseFloat(location.lng) },
            urgencyScore: urgencyScore || 1,
            requiredSkills: requiredSkills || [],
            status: 'Unassigned',
            assignedVolunteerId: null,
            createdAt: new Date().toISOString()
        };
        try {
            const docRef = await getDb().collection('tasks').add(newTask);
            res.status(201).json({ id: docRef.id, ...newTask });
        } catch (err) {
            if (!isFirestoreUnauthenticated(err)) throw err;
            const id = makeId();
            memoryStore.tasks.push({ id, ...newTask });
            res.status(201).json({ id, ...newTask, _store: "memory" });
        }
    } catch (err) {
        console.error("Add Task Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 3. Get Tasks
router.get('/tasks', async (req, res) => {
    try {
        try {
            const snapshot = await getDb().collection('tasks').get();
            const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            res.json(tasks);
        } catch (err) {
            if (!isFirestoreUnauthenticated(err)) throw err;
            res.json(memoryStore.tasks);
        }
    } catch (err) {
        console.error("GET /tasks Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 4. Get Volunteers
router.get('/volunteers', async (req, res) => {
    try {
        try {
            const snapshot = await getDb().collection('volunteers').get();
            const volunteers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            res.json(volunteers);
        } catch (err) {
            if (!isFirestoreUnauthenticated(err)) throw err;
            res.json(memoryStore.volunteers);
        }
    } catch (err) {
        console.error("GET /volunteers Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 5. Complete Task (Delete as requested)
router.post('/tasks/:id/complete', async (req, res) => {
    try {
        const taskId = req.params.id;
        try {
            const taskDoc = await getDb().collection('tasks').doc(taskId).get();
            if (!taskDoc.exists) return res.status(404).json({ error: 'Task not found' });
            
            const task = taskDoc.data();
            if (task.assignedVolunteerId) {
                await getDb().collection('volunteers').doc(task.assignedVolunteerId).update({
                    availability: true,
                    assignedTask: null
                });
            }
            await getDb().collection('tasks').doc(taskId).delete();
            res.json({ message: 'Crisis resolved and removed.', taskId });
        } catch (err) {
            if (!isFirestoreUnauthenticated(err)) throw err;
            const idx = memoryStore.tasks.findIndex(t => t.id === taskId);
            if (idx === -1) return res.status(404).json({ error: 'Task not found' });
            const task = memoryStore.tasks[idx];
            if (task.assignedVolunteerId) {
                const v = memoryStore.volunteers.find(x => x.id === task.assignedVolunteerId);
                if (v) {
                    v.availability = true;
                    v.assignedTask = null;
                }
            }
            memoryStore.tasks.splice(idx, 1);
            res.json({ message: 'Crisis resolved and removed.', taskId, _store: "memory" });
        }
    } catch (err) {
        console.error("Complete Task Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 6. Analytics
router.get('/analytics/demand', async (req, res) => {
    try {
        let tasks;
        try {
            const snapshot = await getDb().collection('tasks').where('status', '==', 'Unassigned').get();
            tasks = snapshot.docs.map(doc => doc.data());
        } catch (err) {
            if (!isFirestoreUnauthenticated(err)) throw err;
            tasks = memoryStore.tasks.filter(t => t.status === "Unassigned");
        }
        const hotspots = tasks.filter(t => t.urgencyScore >= 4).map(t => ({
            location: t.location,
            radius: 5000,
            intensity: t.urgencyScore,
            reason: "High concentration of urgent tasks"
        }));
        res.json({ hotspots });
    } catch (err) {
        console.error("Analytics Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 7. AI Chatbot (Gemini API)
// Note: the legacy SDK (`@google/generative-ai`) uses `v1beta` endpoints which can 404 for newer models.
// We call the stable `v1` REST endpoint directly.
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
const GEMINI_FALLBACK_MODELS = [
    GEMINI_MODEL,
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
];

router.post('/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message) return res.status(400).json({ error: "Message is required" });

        const apiKey = (process.env.GEMINI_API_KEY || "").trim();
        if (!apiKey) return res.status(500).json({ error: "Server is missing GEMINI_API_KEY" });

        const systemPrompt = `You are the CrisisMatch AI Assistant. Provide immediate, calm, and actionable first-aid advice.
Prioritize life-saving actions. Remind the user help is on the way.`;

        const contents = Array.isArray(history) ? history : [];
        contents.push({
            role: "user",
            parts: [{ text: `${systemPrompt}\n\nUser Message: ${message}` }]
        });

        let lastErr;
        for (const modelName of GEMINI_FALLBACK_MODELS) {
            const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const resp = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents,
                    generationConfig: { temperature: 0.4, maxOutputTokens: 512 }
                })
            });

            if (!resp.ok) {
                const detail = await resp.text().catch(() => "");
                if ([404, 429, 503].includes(resp.status)) {
                    lastErr = new Error(`Gemini API error ${resp.status} (model=${modelName}): ${detail}`);
                    continue;
                }
                throw new Error(`Gemini API error ${resp.status} (model=${modelName}): ${detail}`);
            }

            const data = await resp.json();
            const text =
                data?.candidates?.[0]?.content?.parts
                    ?.map(p => p?.text)
                    ?.filter(Boolean)
                    ?.join("") || "";

            if (text) return res.json({ response: text, model: modelName });
            lastErr = new Error(`Empty Gemini response (model=${modelName})`);
        }

        throw lastErr || new Error("Gemini request failed for all models");
    } catch (err) {
        console.error("Chat API Error:", err);
        res.status(503).json({ error: "The AI assistant is temporarily unavailable. Please try again shortly." });
    }
});

// 8. Assign Nearest Volunteer to Task
router.post('/tasks/:id/assign', async (req, res) => {
    try {
        const taskId = req.params.id;
        
        let taskDoc, volunteersDocs;
        let isMemory = false;

        try {
            // Try Firestore
            taskDoc = await getDb().collection('tasks').doc(taskId).get();
            if (!taskDoc.exists) return res.status(404).json({ error: 'Task not found' });
            
            const volsSnap = await getDb().collection('volunteers').where('availability', '==', true).get();
            volunteersDocs = volsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (err) {
            if (!isFirestoreUnauthenticated(err)) throw err;
            isMemory = true;
            taskDoc = memoryStore.tasks.find(t => t.id === taskId);
            if (!taskDoc) return res.status(404).json({ error: 'Task not found' });
            volunteersDocs = memoryStore.volunteers.filter(v => v.availability === true);
        }

        const taskData = isMemory ? taskDoc : taskDoc.data();
        if (taskData.status !== 'Unassigned') {
            return res.status(400).json({ error: 'Task is already assigned' });
        }

        if (!volunteersDocs || volunteersDocs.length === 0) {
            return res.status(404).json({ error: 'No available volunteers found.' });
        }

        // Find nearest
        let nearestVolunteer = null;
        let minDistance = Infinity;

        for (const vol of volunteersDocs) {
            const dist = calculateDistance(taskData.location, vol.location);
            if (dist < minDistance) {
                minDistance = dist;
                nearestVolunteer = vol;
            }
        }

        if (!nearestVolunteer) {
            return res.status(404).json({ error: 'Could not calculate nearest volunteer.' });
        }

        // Update DB
        try {
            if (!isMemory) {
                await getDb().collection('tasks').doc(taskId).update({
                    status: 'Assigned',
                    assignedVolunteerId: nearestVolunteer.id
                });
                await getDb().collection('volunteers').doc(nearestVolunteer.id).update({
                    availability: false,
                    assignedTask: taskId
                });
            } else {
                taskDoc.status = 'Assigned';
                taskDoc.assignedVolunteerId = nearestVolunteer.id;
                
                const volToUpdate = memoryStore.volunteers.find(v => v.id === nearestVolunteer.id);
                if (volToUpdate) {
                    volToUpdate.availability = false;
                    volToUpdate.assignedTask = taskId;
                }
            }
            res.json({ 
                message: 'Volunteer assigned successfully', 
                volunteerId: nearestVolunteer.id, 
                distanceKm: minDistance 
            });
        } catch (err) {
            if (!isFirestoreUnauthenticated(err)) throw err;
            
            // Fallback memory update if DB update fails due to auth
            const t = memoryStore.tasks.find(x => x.id === taskId);
            if (t) {
                t.status = 'Assigned';
                t.assignedVolunteerId = nearestVolunteer.id;
            }
            const v = memoryStore.volunteers.find(x => x.id === nearestVolunteer.id);
            if (v) {
                v.availability = false;
                v.assignedTask = taskId;
            }
            res.json({ message: 'Volunteer assigned successfully (memory)', volunteerId: nearestVolunteer.id });
        }
    } catch (err) {
        console.error("Assign Task Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
