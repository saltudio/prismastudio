
import { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  User
} from "firebase/auth";

export const loginWithEmailPassword = (email: string, pass: string) =>
  signInWithEmailAndPassword(auth, email, pass);

export const registerWithEmailPassword = (email: string, pass: string) =>
  createUserWithEmailAndPassword(auth, email, pass);

export const logout = () => signOut(auth);
export const getRedirect = () => getRedirectResult(auth);
export const onAuthChange = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);
