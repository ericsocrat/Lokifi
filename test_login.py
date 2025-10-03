import requests
import json

url = "http://localhost:8000/api/auth/login"
data = {
    "email": "hello@lokifi.com",
    "password": "?Apollwng113?"
}

try:
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    if response.status_code == 200:
        print("✅ Login successful!")
        print(json.dumps(response.json(), indent=2))
    else:
        print("❌ Login failed!")
except Exception as e:
    print(f"Error: {e}")
