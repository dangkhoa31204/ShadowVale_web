"""Read-only HTTP checks. Optional role tokens must belong to active users in the target database."""
import json
import os
import urllib.error
import urllib.request

client = urllib.request.build_opener(urllib.request.ProxyHandler({}))
base = os.environ.get("ADMIN_API_SMOKE_URL", "http://127.0.0.1:5187")
spec = json.load(client.open(base + "/openapi/v1.json"))
paths = spec["paths"]
admin_routes = [
    ("/api/content-versions", "get"),
    ("/api/content-versions/{id}", "get"),
    ("/api/content-versions/{id}/compare", "get"),
    ("/api/content-versions/{id}/approve", "post"),
    ("/api/content-versions/{id}/reject", "post"),
    ("/api/content-versions/{id}/publish", "post"),
    ("/api/content-publications", "get"),
]
designer_routes = [
    ("/api/content-versions", "post"),
    ("/api/content-versions/{id}", "put"),
    ("/api/content-versions/{id}", "delete"),
    ("/api/content-versions/{id}/validate", "post"),
    ("/api/content-versions/{id}/submit", "post"),
]
for role, routes in [("ADMIN", admin_routes), ("DESIGNER", designer_routes)]:
    for path, method in routes:
        assert paths[path][method]["summary"] == f"{method.upper()} {path} ({role})", path
assert "revision" in spec["components"]["schemas"]["SubmitContentVersionRequest"]["required"]
assert "isActive" in spec["components"]["schemas"]["UpdateUserRequest"]["required"]
print("OpenAPI: route labels, submit revision and update isActive verified")

def check(path, method, token, expected):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(base + path, data=None if method == "GET" else b"{}",
                                     headers=headers, method=method)
    try:
        status = client.open(request).status
    except urllib.error.HTTPError as error:
        status = error.code
    assert status == expected, (path, method, status, expected)

version = "/api/content-versions/00000000-0000-0000-0000-000000000001"
for path, method in [("/api/users", "GET"), (version + "/submit", "POST")]:
    check(path, method, None, 401)
for role in ["DESIGNER", "ANALYST", "ADMIN"]:
    token = os.environ.get(f"API_SMOKE_{role}_TOKEN")
    if not token:
        print(f"Skipped live {role} checks: API_SMOKE_{role}_TOKEN not configured")
        continue
    if role != "ADMIN":
        check("/api/users", "GET", token, 403)
        for action in ["approve", "reject", "publish"]:
            check(version + "/" + action, "POST", token, 403)
        check("/api/content-publications", "GET", token, 403)
    check(version + "/submit", "POST", token, 403 if role == "ANALYST" else 400)
    if role == "ADMIN":
        check("/api/users/00000000-0000-0000-0000-000000000001", "PUT", token, 400)
    print(f"Live {role} authorization/model validation verified")
