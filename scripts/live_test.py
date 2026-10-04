"""End-to-end RLS check against a live Supabase project.

Run after applying supabase/schema.sql:  python scripts/live_test.py
Needs email confirmation OFF (Auth > Providers > Email) so signups return a session.
Every check prints PASS/FAIL; the script exits non-zero if any check fails.
"""
import json, os, secrets, sys, urllib.request, urllib.error

URL = os.environ.get("SUPABASE_URL", "https://oghukjdmuqperhonbugy.supabase.co")
KEY = os.environ.get("SUPABASE_ANON_KEY", "sb_publishable_Q71f9ikNN1k1MRfOD5PxKA_95BNqTYE")
REST = URL + "/rest/v1"
AUTH = URL + "/auth/v1"
RUN = secrets.token_hex(3).upper()          # fresh ids per run, so re-runs don't collide
CARD, PAUSED, APP, EVIL = f"LT{RUN}A", f"LT{RUN}P", f"LTAPP{RUN}", f"LTEVIL{RUN}"
failures = 0


def req(method, path, token=None, body=None):
    r = urllib.request.Request(path, method=method)
    r.add_header("apikey", KEY)
    r.add_header("Authorization", "Bearer " + (token or KEY))
    r.add_header("Content-Type", "application/json")
    r.add_header("Prefer", "return=representation")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(r, data=data) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try: return e.code, json.loads(raw)
        except Exception: return e.code, raw


def check(label, ok, detail=""):
    global failures
    if not ok: failures += 1
    print(f"  {'PASS' if ok else 'FAIL'}  {label}{'  — ' + str(detail)[:160] if detail else ''}")


def signup(email, pw):
    s, j = req("POST", AUTH + "/signup", body={"email": email, "password": pw})
    if s != 200 or not (j or {}).get("access_token"):
        s, j = req("POST", AUTH + "/token?grant_type=password", body={"email": email, "password": pw})
    tok = (j or {}).get("access_token")
    if not tok:
        print(f"  could not get a session for {email}: {str(j)[:150]}")
        return None, None
    return tok, j["user"]["id"]


def profile(card_id, owner, status="active"):
    return {
        "id": card_id, "owner_id": owner, "type": "serious" if status == "active" else "friendship",
        "name": "Live Test Owner", "age": 28, "location": "Cagayan de Oro", "bio": "Live test profile",
        "interests": ["automation"], "hobbies": ["chess"], "looking_for": "something real",
        "prompts": [{"prompt": "I get way too excited about...", "answer": "working systems"}],
        "socials": {"instagram": "@liveowner"}, "status": status, "settings": {"showLocation": True},
    }


print(f"=== run {RUN} ===")
print("1. Sign up / sign in owner + applicant")
tokA, uidA = signup("datecard.owner@gmail.com", "DatecardTest1!")
tokB, uidB = signup("datecard.applicant@gmail.com", "DatecardTest1!")
if not tokA or not tokB:
    print("STOP: turn off email confirmation (Supabase > Auth > Providers > Email) or use real OAuth.")
    sys.exit(1)

# One profile per (owner, type) — clear the owner's old test cards first.
req("DELETE", REST + "/profiles?id=like.LT*", tokA)

print("2. Owner creates an active card and a paused card")
s, j = req("POST", REST + "/profiles", tokA, profile(CARD, uidA))
check("insert active card", s in (200, 201), j if s >= 300 else "")
s, j = req("POST", REST + "/profiles", tokA, profile(PAUSED, uidA, "paused"))
check("insert paused card", s in (200, 201), j if s >= 300 else "")

print("3. Anonymous public read via RPC")
s, j = req("POST", REST + "/rpc/get_public_profile", body={"p_id": CARD})
row = j[0] if isinstance(j, list) and j else {}
check("RPC returns the card", s == 200 and row.get("name") == "Live Test Owner", s)
check("socials are absent", "socials" not in row)
check("owner_id is absent (cards can't be cross-linked)", "owner_id" not in row, row.get("owner_id"))
check("is_mine is false for anon", row.get("is_mine") is False, row.get("is_mine"))
s, j = req("POST", REST + "/rpc/get_public_profile", tokA, {"p_id": CARD})
check("is_mine is true for the owner", isinstance(j, list) and j and j[0].get("is_mine") is True, j)

print("4. Attacks on the applications table")
s, j = req("POST", REST + "/applications", tokB, {
    "id": EVIL, "profile_id": CARD, "applicant_id": uidB, "name": "Sneaky", "status": "accepted"})
check("applicant CANNOT insert a pre-accepted application", s >= 400, s)
s, j = req("POST", REST + "/rpc/reveal_socials", tokB, {"p_id": CARD})
check("...so reveal_socials still returns null", j is None, j)
s, j = req("POST", REST + "/applications", tokB, {
    "id": EVIL + "X", "profile_id": CARD, "applicant_id": uidA, "name": "Impostor", "status": "pending"})
check("applicant CANNOT apply as someone else", s >= 400, s)
s, j = req("POST", REST + "/applications", tokB, {
    "id": EVIL + "P", "profile_id": PAUSED, "applicant_id": uidB, "name": "Late", "status": "pending"})
check("nobody can apply to a paused card", s >= 400, s)
s, j = req("POST", REST + "/applications", body={
    "id": EVIL + "N", "profile_id": CARD, "name": "Anon", "status": "pending"})
check("anonymous users cannot apply", s >= 400, s)

print("5. Honest application flow")
s, j = req("POST", REST + "/applications", tokB, {
    "id": APP, "profile_id": CARD, "applicant_id": uidB, "name": "Live Applicant",
    "handle": "@applicant", "platform": "google", "emoji": "🌙",
    "note": "your Sunday routine sounds like mine", "status": "pending"})
check("applicant applies (pending)", s in (200, 201), j if s >= 300 else "")
s, j = req("POST", REST + "/rpc/reveal_socials", tokB, {"p_id": CARD})
check("reveal while pending is null", j is None, j)
s, j = req("GET", REST + f"/applications?id=eq.{APP}", tokB)
check("applicant reads own application", isinstance(j, list) and len(j) == 1, j)
s, j = req("PATCH", REST + f"/applications?id=eq.{APP}", tokB, {"status": "accepted"})
check("applicant CANNOT accept themselves", not (isinstance(j, list) and j), j)
s, j = req("PATCH", REST + f"/applications?id=eq.{APP}", tokA, {"status": "accepted"})
check("owner accepts", s in (200, 204) and isinstance(j, list) and j, j)
s, j = req("POST", REST + "/rpc/reveal_socials", tokB, {"p_id": CARD})
check("reveal after accept returns socials", isinstance(j, dict) and j.get("instagram") == "@liveowner", j)
s, j = req("POST", REST + "/rpc/reveal_socials", tokA, {"p_id": CARD})
check("owner can always reveal", isinstance(j, dict), j)

print("6. Events")
s, j = req("POST", REST + "/events", body={"profile_id": CARD, "kind": "view"})
check("anon logs a view", s in (200, 201), s)
s, j = req("POST", REST + "/events", body={"profile_id": CARD, "kind": "accept"})
check("anon CANNOT log an accept", s >= 400, s)
s, j = req("GET", REST + f"/events?profile_id=eq.{CARD}", tokA)
check("owner reads events", isinstance(j, list) and len(j) >= 1, j)
s, j = req("GET", REST + f"/events?profile_id=eq.{CARD}", tokB)
check("applicant reads no events", j == [], j)

print("7. Direct table access")
s, j = req("POST", REST + "/profiles", tokB, {"id": f"LT{RUN}X", "owner_id": uidA, "type": "casual", "name": "Should Fail"})
check("cannot insert a profile owned by someone else", s >= 400, s)
s, j = req("GET", REST + f"/profiles?id=eq.{CARD}")
check("anon direct read of profiles returns nothing", j == [], j)

print(f"\n{'ALL PASS' if not failures else f'{failures} FAILURE(S)'}")
sys.exit(1 if failures else 0)
