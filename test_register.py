import requests
import json

url = "http://localhost:8000/api/auth/register"
data = {
    "email": "hello@lokifi.com",
    "password": "?Apollwng113?",
    "full_name": "Test User"
}

try:
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    if response.status_code == 201 or response.status_code == 200:
        print("✅ Registration successful!")
        print(json.dumps(response.json(), indent=2))
    else:
        print("❌ Registration failed!")
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
