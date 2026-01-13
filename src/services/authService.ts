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

  // Always set status to 'online' when converting (user is logging in)
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || 'Anonymous',
    email: firebaseUser.email || '',
    avatar: firebaseUser.photoURL || undefined,
    status: 'online', // Always online when user is actively using the app
    statusText: userData?.statusText || '',
  };
};

// Create user document in Firestore
const createUserDocument = async (firebaseUser: FirebaseUser, displayName?: string) => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      name: displayName || firebaseUser.displayName || 'Anonymous',
      email: firebaseUser.email,
      avatar: firebaseUser.photoURL || null,
      status: 'online',
      statusText: '',
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    });
  } else {
    // Update name if it's missing and we have a displayName
    const userData = userSnap.data();
    if (!userData.name && displayName) {
      await setDoc(userRef, { name: displayName }, { merge: true });
    }
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

  // Create user document in Firestore with the displayName
  await createUserDocument(userCredential.user, displayName);

  return convertFirebaseUser(userCredential.user);
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);

  // Ensure user document exists and has displayName
  await createUserDocument(userCredential.user, userCredential.user.displayName || undefined);

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
