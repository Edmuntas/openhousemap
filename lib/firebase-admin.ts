import "server-only";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import {
  getApps,
  initializeApp,
  cert,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage, type Storage } from "firebase-admin/storage";

let _app: App | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;
let _storage: Storage | null = null;

function getApp(): App {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }

  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "openhousemap";

  // Option 1: base64-encoded service account in FIREBASE_SERVICE_ACCOUNT (production/Cloud Run)
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (b64) {
    const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    _app = initializeApp({
      credential: cert(json),
      projectId: projectId ?? json.project_id,
    });
    return _app;
  }

  // Option 2: GOOGLE_APPLICATION_CREDENTIALS file path (local dev)
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    const absPath = resolve(process.cwd(), credPath);
    if (existsSync(absPath)) {
      const json = JSON.parse(readFileSync(absPath, "utf8"));
      _app = initializeApp({
        credential: cert(json),
        projectId: projectId ?? json.project_id,
      });
      return _app;
    }
  }

  // Option 3: Application Default Credentials (Cloud Run/GCE with attached SA)
  _app = initializeApp({
    credential: applicationDefault(),
    projectId,
  });
  return _app;
}

export const adminApp = new Proxy({} as App, {
  get(_, prop) {
    return Reflect.get(getApp(), prop);
  },
}) as App;

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    if (!_db) _db = getFirestore(getApp());
    return Reflect.get(_db, prop);
  },
}) as Firestore;

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    if (!_auth) _auth = getAuth(getApp());
    return Reflect.get(_auth, prop);
  },
}) as Auth;

export const adminStorage: Storage = new Proxy({} as Storage, {
  get(_, prop) {
    if (!_storage) _storage = getStorage(getApp());
    return Reflect.get(_storage, prop);
  },
}) as Storage;
