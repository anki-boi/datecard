// OAuth sign-in leaves the page. Anything the person typed before clicking
// "Continue with Google" goes into sessionStorage first and comes back after.

const PREFIX = "datecard.draft.";

export function saveDraft(key, value) {
  try { sessionStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* private mode */ }
}

export function loadDraft(key) {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraft(key) {
  try { sessionStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
}
