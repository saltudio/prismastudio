
import { db } from "./firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  onSnapshot,
  orderBy
} from "firebase/firestore";

export type UserStatus = "pending" | "approved" | "blocked";

export interface UserProfile {
  uid: string;
  email: string;
  status: UserStatus;
  createdAt?: any;
  updatedAt?: any;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function ensureUserProfile(uid: string, email: string): Promise<UserProfile> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const profile: UserProfile = {
      uid,
      email,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, profile, { merge: true });
    return profile;
  }

  const data = snap.data() as UserProfile;
  if (email && data.email !== email) {
    await updateDoc(ref, { email, updatedAt: serverTimestamp() });
  }
  return { ...data, email: data.email || email, status: data.status || "pending" };
}

export function listenToUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
  const ref = doc(db, "users", uid);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as UserProfile);
    } else {
      callback(null);
    }
  });
}

export function listenToAllUsers(callback: (users: UserProfile[]) => void) {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
    callback(users);
  });
}

export async function updateUserStatus(uid: string, status: UserStatus): Promise<void> {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { status, updatedAt: serverTimestamp() });
}
