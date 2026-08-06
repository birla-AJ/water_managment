// Holds the GPS location captured on the splash screen (best-effort, silent
// permission prompt) so it can be sent along with the very first OTP verify
// for a brand-new customer — without asking for location again mid-registration.
// Stays null for the whole session if the customer declined the permission.

let pending: { latitude: number; longitude: number } | null = null;

export function setPendingLocation(loc: { latitude: number; longitude: number } | null): void {
  pending = loc;
}

export function getPendingLocation(): { latitude: number; longitude: number } | null {
  return pending;
}
