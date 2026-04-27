const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

// Initialize Firebase Admin
console.log("Starting Firebase Admin Initialization...");
try {
  let serviceAccount;

  // Prefer reading credentials from a file path (avoids .env newline/quoting issues)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_FILE) {
    const p = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_FILE;
    const raw = fs.readFileSync(p, 'utf8');
    serviceAccount = JSON.parse(raw);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    // Allow surrounding single/double quotes in .env
    raw = raw.trim();
    if (
      (raw.startsWith("'") && raw.endsWith("'")) ||
      (raw.startsWith('"') && raw.endsWith('"'))
    ) {
      raw = raw.slice(1, -1);
    }
    serviceAccount = JSON.parse(raw);
  }

  if (serviceAccount) {
    console.log("Service Account Project ID:", serviceAccount.project_id);

    // Normalize private key newlines when loaded from .env
    if (typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    console.log("Firebase Admin Initialized Successfully");

    // Check whether we can mint an OAuth access token at all
    Promise.resolve(admin.app().options.credential.getAccessToken())
      .then((t) => {
        console.log("Firebase Admin access token OK:", {
          expiresInSeconds: t?.expires_in,
        });
      })
      .catch((err) => {
        console.error("Firebase Admin access token FAILED:", {
          code: err?.code,
          message: err?.message,
          details: err?.details,
        });
      });

    // Firestore connectivity check (helps diagnose UNAUTHENTICATED vs permissions issues)
    admin
      .firestore()
      .listCollections()
      .then((cols) => {
        console.log(`Firestore OK (collections: ${cols.length})`);
      })
      .catch((err) => {
        console.error("Firestore connectivity check failed:", {
          code: err?.code,
          message: err?.message,
          details: err?.details,
        });
      });
  } else {
    console.warn("Could not find valid Firebase credentials. Running without DB.");
  }
} catch (error) {
  console.error("Firebase Initialization Error:", error.message);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Import API routes
const apiRoutes = require('./controllers/api');
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

// Some environments/libraries may call `unref()` on servers (which allows Node to exit).
// Ensure the HTTP server keeps the event loop alive.
if (server && typeof server.ref === 'function') {
  server.ref();
}

// Extra safety: keep the event loop alive even if something unrefs the server.
setInterval(() => {}, 60_000);
