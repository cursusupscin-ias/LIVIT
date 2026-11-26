import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

// This small ESM bundle is loaded only inside the native Capacitor WebView.
// The main LIVIT HTML continues to use its existing Firebase 11.10.0 CDN SDK.
export const isNativePlatform = () => Capacitor.isNativePlatform();
export const signInWithGoogle = () => FirebaseAuthentication.signInWithGoogle();
export const signOut = () => FirebaseAuthentication.signOut();
