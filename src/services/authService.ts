import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { User } from '../types/index';

const googleProvider = new GoogleAuthProvider();

// Convert Firebase User to our User type
export const convertFirebaseUser = async (firebaseUser: FirebaseUser): Promise<User> => {
  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
  const userData = userDoc.data();

  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || 'Anonymous',
    email: firebaseUser.email || '',
    avatar: firebaseUser.photoURL || undefined,
    status: userData?.status || 'online',
    statusText: userData?.statusText || '',
  };
};

// Create user document in Firestore
const createUserDocument = async (firebaseUser: FirebaseUser) => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      name: firebaseUser.displayName || 'Anonymous',
      email: firebaseUser.email,
      avatar: firebaseUser.photoURL || null,
      status: 'online',
      statusText: '',
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    });
  }
};

// Sign up with email and password
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string
): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  // Update profile with display name
  await updateProfile(userCredential.user, { displayName });

  // Create user document in Firestore
  await createUserDocument(userCredential.user);

  return convertFirebaseUser(userCredential.user);
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return convertFirebaseUser(userCredential.user);
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<User> => {
  const userCredential = await signInWithPopup(auth, googleProvider);
  await createUserDocument(userCredential.user);
  return convertFirebaseUser(userCredential.user);
};

// Sign out
export const logOut = async (): Promise<void> => {
  await signOut(auth);
};

// Listen to auth state changes
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const user = await convertFirebaseUser(firebaseUser);
      callback(user);
    } else {
      callback(null);
    }
  });
};
