"""Local HTTP smoke test; use only with an isolated API instance and the test JWT key below."""
import base64
import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.request

client = urllib.request.build_opener(urllib.request.ProxyHandler({}))
base = os.environ.get("ADMIN_API_SMOKE_URL", "http://127.0.0.1:5187")
spec = json.load(client.open(base + "/openapi/v1.json"))
paths = spec["paths"]
expected = {
    "/api/content-versions": "get",
    "/api/content-versions/{id}": "get",
    "/api/content-versions/{id}/compare": "get",
    "/api/content-versions/{id}/approve": "post",
    "/api/content-versions/{id}/reject": "post",
    "/api/content-versions/{id}/publish": "post",
    "/api/content-publications": "get",
}
for path, method in expected.items():
    assert paths[path][method]["summary"] == f"{method.upper()} {path} (ADMIN)", path
print("OpenAPI: all seven ADMIN summaries verified")
submit_path = "/api/content-versions/{id}/submit"
assert paths[submit_path]["post"]["summary"] == f"POST {submit_path} (DESIGNER)"
assert "revision" in spec["components"]["schemas"]["SubmitContentVersionRequest"]["required"]
print("OpenAPI: DESIGNER submit summary and required revision verified")
for path, method in [
    ("/api/content-versions", "post"),
    ("/api/content-versions/{id}", "put"),
    ("/api/content-versions/{id}", "delete"),
    ("/api/content-versions/{id}/validate", "post"),
]:
    assert paths[path][method]["summary"] == f"{method.upper()} {path} (DESIGNER)", (path, method)
print("OpenAPI: create/update/delete/validate DESIGNER summaries verified")

def encode(value):
    return base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode()).rstrip(b"=")

for role in [None, "Designer", "Analyst"]:
    headers = {"Content-Type": "application/json"}
    if role:
        unsigned = encode({"alg": "HS256", "typ": "JWT"}) + b"." + encode({
            "iss": "admin-api-smoke", "aud": "admin-api-smoke",
            "sub": "00000000-0000-0000-0000-000000000002", "role": role,
            "exp": int(time.time()) + 300,
        })
        signature = base64.urlsafe_b64encode(hmac.new(
            b"local-smoke-test-key-32-characters-only", unsigned, hashlib.sha256).digest()).rstrip(b"=")
        headers["Authorization"] = "Bearer " + (unsigned + b"." + signature).decode()
    for path, method in list(expected.items())[3:]:
        path = path.replace("{id}", "00000000-0000-0000-0000-000000000001")
        body = None if method == "get" else json.dumps({"revision": 4, "reviewNote": "No", "reason": "Release"}).encode()
        request = urllib.request.Request(base + path, data=body, headers=headers, method=method.upper())
        try:
            status = client.open(request).status
        except urllib.error.HTTPError as error:
            status = error.code
        assert status == (403 if role else 401), (role, path, status)
    print(f"Authorization: {role or 'Anonymous'} verified across four Admin endpoints")

for role, expected_status in [(None, 401), ("Analyst", 403), ("Designer", 400), ("Admin", 400)]:
    headers = {"Content-Type": "application/json"}
    if role:
        unsigned = encode({"alg": "HS256", "typ": "JWT"}) + b"." + encode({
            "iss": "admin-api-smoke", "aud": "admin-api-smoke",
            "sub": "00000000-0000-0000-0000-000000000002", "role": role,
            "exp": int(time.time()) + 300,
        })
        signature = base64.urlsafe_b64encode(hmac.new(
            b"local-smoke-test-key-32-characters-only", unsigned, hashlib.sha256).digest()).rstrip(b"=")
        headers["Authorization"] = "Bearer " + (unsigned + b"." + signature).decode()
    # Missing revision triggers model validation before database access for permitted roles.
    request = urllib.request.Request(base + submit_path.replace("{id}", "00000000-0000-0000-0000-000000000001"),
                                     data=b"{}", headers=headers, method="POST")
    try:
        status = client.open(request).status
    except urllib.error.HTTPError as error:
        status = error.code
    assert status == expected_status, (role, status)
    print(f"Submit authorization/model validation: {role or 'Anonymous'} -> {status}")
