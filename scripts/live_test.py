import json, urllib.request, urllib.error

URL = "https://oghukjdmuqperhonbugy.supabase.co"
KEY = "sb_publishable_Q71f9ikNN1k1MRfOD5PxKA_95BNqTYE"
REST = URL + "/rest/v1"
AUTH = URL + "/auth/v1"

def req(method, path, token=None, body=None, anon=True):
    r = urllib.request.Request(path, method=method)
    r.add_header("apikey", KEY)
    r.add_header("Authorization", "Bearer " + (token or KEY))
    r.add_header("Content-Type", "application/json")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(r, data=data) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try: return e.code, json.loads(raw)
        except: return e.code, raw

def signup(email, pw):
    s, j = req("POST", AUTH + "/signup", body={"email": email, "password": pw})
    if s != 200:
        print(f"  SIGNUP {email}: FAIL {s} {str(j)[:200]}")
        return None
    tok = (j.get("access_token") or "").strip()
    if not tok:
        print(f"  SIGNUP {email}: no session (email confirmation likely ON) — {str(j)[:150]}")
        return None
    print(f"  SIGNUP {email}: OK (user {j['user']['id']})")
    return tok

print("=== 1. Sign up owner + applicant ===")
tokA = signup("datecard.owner@gmail.com", "DatecardTest1!")
tokB = signup("datecard.applicant@gmail.com", "DatecardTest1!")
if not tokA or not tokB:
    print("\nSTOP: need email confirmation off (Supabase > Auth > Providers > Email > disable 'Confirm email') or use real OAuth.")
    raise SystemExit(1)

print("\n=== 2. Owner inserts profile (with socials) ===")
s, j = req("POST", REST + "/profiles", tokA, {
    "id": "LIVETEST01", "owner_id": None, "type": "serious", "name": "Live Test Owner",
    "age": 28, "location": "Cagayan de Oro", "bio": "Live test profile",
    "interests": ["automation", "pharmacy"], "hobbies": ["chess"],
    "looking_for": "something real", "prompts": [{"prompt": "I get way too excited about...", "answer": "working systems"}],
    "socials": {"instagram": "@liveowner", "facebook": "fb.com/liveowner"},
    "status": "active", "settings": {"showLocation": True},
})
print(f"  insert: HTTP {s} {str(j)[:120]}")

print("\n=== 3. Anonymous public read via RPC (socials must be ABSENT) ===")
s, j = req("POST", REST + "/rpc/get_public_profile", body={"p_id": "LIVETEST01"})
row = j[0] if isinstance(j, list) and j else None
print(f"  HTTP {s} | name={row and row.get('name')} | has socials key: {'socials' in (row or {})} | prompts: {row and row.get('prompts')}")

print("\n=== 4. Applicant applies (pending) ===")
s, j = req("POST", REST + "/applications", tokB, {
    "id": "LIVEAPP01", "profile_id": "LIVETEST01", "applicant_id": None,
    "name": "Live Applicant", "handle": "@applicant", "platform": "instagram",
    "emoji": "🌙", "note": "your Sunday routine sounds like mine", "status": "pending",
})
print(f"  insert: HTTP {s} {str(j)[:120]}")

print("\n=== 5. Applicant tries reveal while PENDING (must be null) ===")
s, j = req("POST", REST + "/rpc/reveal_socials", tokB, {"p_id": "LIVETEST01"})
print(f"  HTTP {s} | socials: {j}")

print("\n=== 6. Applicant reads own application row (RLS must allow) ===")
s, j = req("GET", REST + "/applications?id=eq.LIVEAPP01", tokB)
print(f"  HTTP {s} | rows: {len(j) if isinstance(j, list) else j} | status: {j[0].get('status') if isinstance(j, list) and j else '-'}")

print("\n=== 7. Owner accepts ===")
s, j = req("PATCH", REST + "/applications?id=eq.LIVEAPP01", tokA, {"status": "accepted"})
print(f"  patch: HTTP {s} {str(j)[:120]}")

print("\n=== 8. Applicant reveal AFTER accept (must return socials) ===")
s, j = req("POST", REST + "/rpc/reveal_socials", tokB, {"p_id": "LIVETEST01"})
print(f"  HTTP {s} | socials: {j}")

print("\n=== 9. Owner reveal (always allowed) ===")
s, j = req("POST", REST + "/rpc/reveal_socials", tokA, {"p_id": "LIVETEST01"})
print(f"  HTTP {s} | socials: {j}")

print("\n=== 10. Events: anon logs view; owner reads; applicant blocked ===")
s, j = req("POST", REST + "/events", body={"profile_id": "LIVETEST01", "kind": "view"})
print(f"  anon insert: HTTP {s}")
s, j = req("GET", REST + "/events?profile_id=eq.LIVETEST01", tokA)
print(f"  owner read: HTTP {s} | rows: {len(j) if isinstance(j, list) else j}")
s, j = req("GET", REST + "/events?profile_id=eq.LIVETEST01", tokB)
print(f"  applicant read: HTTP {s} | rows: {len(j) if isinstance(j, list) else j}")

print("\n=== 11. Owner cannot insert a profile they don't own (RLS check) ===")
s, j = req("POST", REST + "/profiles", tokB, {"id": "LIVETEST02", "type": "casual", "name": "Should Fail", "socials": {"instagram": "@x"}})
print(f"  insert as other user: HTTP {s} (expect 403)")

print("\n=== 12. Public profiles endpoint (anon direct read must be blocked) ===")
s, j = req("GET", REST + "/profiles?id=eq.LIVETEST01")
print(f"  anon direct read: HTTP {s} | {j}")
