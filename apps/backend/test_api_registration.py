"""Quick API test for user registration"""

import json

import requests

url = "http://localhost:8000/api/auth/register"
data = {
    "email": "api-test-final@test.com",
    "password": "SecurePass123!",
    "full_name": "API Test User",
}

print("🔍 Testing Registration API...")
print(f"URL: {url}")
print(f"Data: {json.dumps(data, indent=2)}")
print()

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 200:
        print("\n✅ Registration successful!")
    else:
        print("\n❌ Registration failed!")
except Exception as e:
    print(f"\n❌ Error: {e}")
