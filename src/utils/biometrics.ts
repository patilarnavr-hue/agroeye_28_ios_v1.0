/**
 * Biometric Authentication using Web Authentication API (WebAuthn)
 * Supports Touch ID, Face ID, and other platform authenticators
 */

import { supabase } from "@/integrations/supabase/client";

// Check if biometrics are available
export async function isBiometricAvailable(): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    return false;
  }

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

// Get biometric type name
export function getBiometricTypeName(): string {
  const ua = navigator.userAgent.toLowerCase();
  
  if (ua.includes("iphone") || ua.includes("ipad")) {
    return "Face ID / Touch ID";
  } else if (ua.includes("mac")) {
    return "Touch ID";
  } else if (ua.includes("android")) {
    return "Fingerprint";
  } else if (ua.includes("windows")) {
    return "Windows Hello";
  }
  
  return "Biometrics";
}

// Generate a random challenge
function generateChallenge(): Uint8Array {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

// Convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Register biometric credential
export async function registerBiometric(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const challenge = generateChallenge();
    const userIdBuffer = new TextEncoder().encode(userId);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge.buffer as ArrayBuffer,
      rp: {
        name: "AgroEye",
        id: window.location.hostname,
      },
      user: {
        id: userIdBuffer.buffer as ArrayBuffer,
        name: `user-${userId.slice(0, 8)}`,
        displayName: "AgroEye User",
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },   // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
      attestation: "none",
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      return { success: false, error: "Failed to create credential" };
    }

    // Store credential ID locally
    const credentialId = arrayBufferToBase64(credential.rawId);
    localStorage.setItem(`agroeye_biometric_${userId}`, credentialId);
    localStorage.setItem("agroeye_biometric_enabled", "true");

    return { success: true };
  } catch (error) {
    console.error("Biometric registration failed:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Registration failed" 
    };
  }
}

// Authenticate with biometrics
export async function authenticateWithBiometric(): Promise<{ success: boolean; error?: string }> {
  try {
    const enabled = localStorage.getItem("agroeye_biometric_enabled");
    if (enabled !== "true") {
      return { success: false, error: "Biometrics not enabled" };
    }

    // Get current user to find their credential
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "No user session" };
    }

    const storedCredentialId = localStorage.getItem(`agroeye_biometric_${user.id}`);
    if (!storedCredentialId) {
      return { success: false, error: "No biometric credential found" };
    }

    const challenge = generateChallenge();
    const credentialIdBuffer = base64ToArrayBuffer(storedCredentialId);

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: challenge.buffer as ArrayBuffer,
      rpId: window.location.hostname,
      allowCredentials: [
        {
          id: credentialIdBuffer,
          type: "public-key",
          transports: ["internal"],
        },
      ],
      userVerification: "required",
      timeout: 60000,
    };

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    }) as PublicKeyCredential;

    if (!assertion) {
      return { success: false, error: "Authentication failed" };
    }

    return { success: true };
  } catch (error) {
    console.error("Biometric authentication failed:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Authentication failed" 
    };
  }
}

// Check if biometrics are enabled for user
export function isBiometricEnabled(): boolean {
  return localStorage.getItem("agroeye_biometric_enabled") === "true";
}

// Disable biometrics
export function disableBiometric(userId: string): void {
  localStorage.removeItem(`agroeye_biometric_${userId}`);
  localStorage.removeItem("agroeye_biometric_enabled");
}
