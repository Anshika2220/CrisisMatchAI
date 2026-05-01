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
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-1.5-flash").trim();
const GEMINI_FALLBACK_MODELS = [
    GEMINI_MODEL,
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
];

const CHAT_TOOLS = [
  {
    function_declarations: [
      {
        name: "report_crisis",
        description: "Report a new crisis situation. Use this when the user describes a problem at a specific location.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short title of the crisis (e.g., 'House Fire', 'Medical Emergency')" },
            description: { type: "string", description: "Detailed description of the situation" },
            location_name: { type: "string", description: "Human-readable address or location name (e.g., '123 Main St, Springfield')" },
            urgency_score: { type: "integer", description: "Urgency level from 1 (minimal) to 5 (critical)" },
            required_skills: { type: "array", items: { type: "string" }, description: "List of skills needed (e.g., ['First Aid', 'Firefighting'])" }
          },
          required: ["title", "description", "location_name"]
        }
      },
      {
        name: "find_volunteer",
        description: "Find and assign the nearest volunteer to an existing task.",
        parameters: {
          type: "object",
          properties: {
            task_id: { type: "string", description: "The ID of the task to assign a volunteer to" }
          },
          required: ["task_id"]
        }
      }
    ]
  }
];

// Helper: Geocode for tool
const geocodeTool = async (address) => {
    if (!address || typeof address !== 'string') return null;
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`, {
            headers: { 'User-Agent': 'CrisisMatchAI/1.0', 'Accept-Language': 'en' }
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    } catch (e) {
        console.error("Tool geocoding failed:", e.message);
    }
    return null;
};

router.post('/chat', async (req, res) => {
    try {
        const { message, history, coords } = req.body;
        if (!message) return res.status(400).json({ error: "Message is required" });

        const apiKey = (process.env.GEMINI_API_KEY || "").trim();
        if (!apiKey) return res.status(500).json({ error: "Server is missing GEMINI_API_KEY" });

        const locationContext = coords ? `(User is at Lat: ${coords.lat}, Lng: ${coords.lng})` : "(Location unknown)";

        const systemPrompt = `EMERGENCY PROTOCOL: You are CrisisMatch AI. 
        - BE EXTREMELY CONCISE.
        - If the user is in danger or mentions an emergency, IMMEDIATELY call 'report_crisis'. 
        - Use the coordinates in 'Context' if the user doesn't provide a specific address or says "here".
        - After reporting, the system automatically dispatches help.
        - End with ONE critical question (e.g., "Any injuries?", "How many victims?").
        - Goal: ZERO delay in reporting.`;

        let contents = Array.isArray(history) ? [...history] : [];
        if (contents.length === 0 || (contents.length > 0 && contents[0].role !== 'user')) {
            contents.push({
                role: "user",
                parts: [{ text: `${systemPrompt}\n\nContext: ${locationContext}\n\nUser: ${message}` }]
            });
        } else {
            contents.push({ role: "user", parts: [{ text: message }] });
        }

        let lastErr;
        let capturedTaskId = null;
        for (const modelName of GEMINI_FALLBACK_MODELS) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;
                
                // Initial call to model
                let resp = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents,
                        tools: CHAT_TOOLS,
                        generationConfig: { temperature: 0.1, maxOutputTokens: 256 }
                    })
                });

                if (!resp.ok) {
                    const detail = await resp.text();
                    lastErr = new Error(`Gemini API ${resp.status}: ${detail}`);
                    continue;
                }

                if (!data || !data.candidates) {
                    console.error("Malformed Gemini response:", JSON.stringify(data));
                    lastErr = new Error("Malformed response from AI model");
                    continue;
                }

                let candidate = data.candidates[0];
                let modelParts = candidate?.content?.parts || [];

                // Handle Tool Calls
                const toolCalls = modelParts.filter(p => p.functionCall);
                if (toolCalls.length > 0) {
                    const toolResults = [];
                    for (const call of toolCalls) {
                        const { name, args } = call.functionCall;
                        let result;

                        if (name === 'report_crisis') {
                            let taskCoords = null;
                            const locName = (args.location_name || "").toLowerCase();
                            
                            if ((locName === "here" || locName === "current location" || !args.location_name) && coords) {
                                taskCoords = coords;
                            } else {
                                taskCoords = await geocodeTool(args.location_name);
                            }

                            if (!taskCoords) {
                                result = { error: "Could not find coordinates. Please ask user for a more specific address." };
                            } else {
                                const newTask = {
                                    title: args.title || "Crisis Report",
                                    description: args.description || "Reported via AI Assistant",
                                    location: taskCoords,
                                    urgencyScore: args.urgency_score || 3,
                                    requiredSkills: args.required_skills || [],
                                    status: 'Unassigned',
                                    assignedVolunteerId: null,
                                    createdAt: new Date().toISOString()
                                };
                                try {
                                    const docRef = await getDb().collection('tasks').add(newTask);
                                    const taskId = docRef.id;
                                    
                                    // PROACTIVE: Automatically try to find a volunteer immediately
                                    let assignmentResult = "Searching for volunteer...";
                                    try {
                                        const volsSnap = await getDb().collection('volunteers').where('availability', '==', true).get();
                                        const volunteers = volsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                                        let nearest = null, minDist = Infinity;
                                        for (const vol of volunteers) {
                                            const d = calculateDistance(taskCoords, vol.location);
                                            if (d < minDist) { minDist = d; nearest = vol; }
                                        }
                                        if (nearest) {
                                            await getDb().collection('tasks').doc(taskId).update({ status: 'Assigned', assignedVolunteerId: nearest.id });
                                            await getDb().collection('volunteers').doc(nearest.id).update({ availability: false, assignedTask: taskId });
                                            assignmentResult = `Assigned nearest volunteer: ${nearest.name} (~${minDist.toFixed(1)}km away)`;
                                        } else {
                                            assignmentResult = "No volunteers currently available in range.";
                                        }
                                    } catch (e) { assignmentResult = "Volunteer search pending."; }

                                    result = { success: true, taskId, status: "Reported & Dispatched", assignment: assignmentResult };
                                    capturedTaskId = taskId;
                                } catch (e) {
                                    const id = makeId();
                                    memoryStore.tasks.push({ id, ...newTask });
                                    result = { success: true, taskId: id, message: "Reported (memory fallback)" };
                                    capturedTaskId = id;
                                }
                            }
                        } else if (name === 'find_volunteer') {
                            // Re-use logic from assign route
                            const taskId = args.task_id;
                            try {
                                const taskDoc = await getDb().collection('tasks').doc(taskId).get();
                                if (!taskDoc.exists) {
                                    result = { error: "Task not found" };
                                } else {
                                    const volsSnap = await getDb().collection('volunteers').where('availability', '==', true).get();
                                    const volunteers = volsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                                    const taskData = taskDoc.data();
                                    
                                    let nearest = null, minDist = Infinity;
                                    for (const vol of volunteers) {
                                        const d = calculateDistance(taskData.location, vol.location);
                                        if (d < minDist) { minDist = d; nearest = vol; }
                                    }
                                    
                                    if (nearest) {
                                        await getDb().collection('tasks').doc(taskId).update({ status: 'Assigned', assignedVolunteerId: nearest.id });
                                        await getDb().collection('volunteers').doc(nearest.id).update({ availability: false, assignedTask: taskId });
                                        result = { success: true, volunteer: nearest.name, distanceKm: minDist.toFixed(2) };
                                    } else {
                                        result = { error: "No available volunteers found." };
                                    }
                                }
                            } catch (e) {
                                result = { error: "Volunteer search failed: " + e.message };
                            }
                        }

                        toolResults.push({
                            functionResponse: { name, response: { content: result } }
                        });
                    }

                    // Second call with tool results
                    contents.push(candidate.content);
                    contents.push({ role: "function", parts: toolResults });

                    resp = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contents, tools: CHAT_TOOLS, generationConfig: { temperature: 0.1, maxOutputTokens: 256 } })
                    });
                    
                    if (!resp.ok) {
                        const detail = await resp.text();
                        lastErr = new Error(`Gemini API (Step 2) ${resp.status}: ${detail}`);
                        continue;
                    }

                    data = await resp.json();
                    candidate = data?.candidates?.[0];
                    modelParts = candidate?.content?.parts || [];
                }

                const text = modelParts.map(p => p.text).filter(Boolean).join("");
                if (text) return res.json({ response: text, model: modelName, taskId: capturedTaskId });
                
                lastErr = new Error("Empty response from model");
            } catch (err) {
                console.error(`Error with model ${modelName}:`, err.message);
                lastErr = err;
            }
        }

        throw lastErr || new Error("Chat service unavailable");
    } catch (err) {
        console.error("Chat API Error:", err);
        res.status(503).json({ error: "I'm having trouble thinking right now. Please try again or call emergency services." });
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
