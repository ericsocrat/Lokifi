"""
Test script for Phase J authentication endpoints.
"""

import requests

BASE_URL = "http://localhost:8000"


def test_auth_endpoints():
    print("🧪 Testing Phase J Authentication Endpoints")
    print("=" * 50)

    # Test health check first
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 200:
            print("✅ Health check passed")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server. Is it running?")
        return

    # Test auth check without token
    print("\n📋 Testing auth check without token...")
    response = requests.get(f"{BASE_URL}/api/auth/check")
    if response.status_code == 200:
        data = response.json()
        if not data["authenticated"]:
            print("✅ Auth check without token works correctly")
        else:
            print("❌ Auth check should show not authenticated")
    else:
        print(f"❌ Auth check failed: {response.status_code}")

    # Test user registration
    print("\n📝 Testing user registration...")
    user_data = {
        "email": "test@example.com",
        "password": "TestUser123!",
        "full_name": "Test User",
        "username": "testuser",
    }

    response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
    if response.status_code in [200, 201]:
        print("✅ User registration successful")
        register_data = response.json()
        print(f"   User ID: {register_data['user']['id']}")
        print(f"   Email: {register_data['user']['email']}")
        print(
            f"   Username: {register_data['profile']['username'] if register_data['profile'] else 'N/A'}"
        )

        # Save cookies for later tests
        cookies = response.cookies
    elif response.status_code == 409:
        print("ℹ️  User already exists, trying login instead...")

        # Test login
        login_data = {"email": user_data["email"], "password": user_data["password"]}

        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            print("✅ User login successful")
            login_data = response.json()
            print(f"   User ID: {login_data['user']['id']}")
            print(f"   Email: {login_data['user']['email']}")
            cookies = response.cookies
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return
    else:
        print(f"❌ Registration failed: {response.status_code} - {response.text}")
        return

    # Test /me endpoint with cookies
    print("\n👤 Testing /me endpoint with authentication...")
    response = requests.get(f"{BASE_URL}/api/auth/me", cookies=cookies)
    if response.status_code == 200:
        data = response.json()
        print("✅ /me endpoint works with authentication")
        print(f"   User: {data['user']['full_name']}")
        print(f"   Profile: {data['profile']['display_name'] if data['profile'] else 'No profile'}")
    else:
        print(f"❌ /me endpoint failed: {response.status_code} - {response.text}")

    # Test auth check with token
    print("\n🔐 Testing auth check with token...")
    response = requests.get(f"{BASE_URL}/api/auth/check", cookies=cookies)
    if response.status_code == 200:
        data = response.json()
        if data["authenticated"]:
            print("✅ Auth check with token works correctly")
            print(f"   User ID: {data['user_id']}")
            print(f"   Email: {data['email']}")
        else:
            print("❌ Auth check should show authenticated")
    else:
        print(f"❌ Auth check with token failed: {response.status_code}")

    # Test logout
    print("\n👋 Testing logout...")
    response = requests.post(f"{BASE_URL}/api/auth/logout", cookies=cookies)
    if response.status_code == 200:
        data = response.json()
        print("✅ Logout successful")
        print(f"   Message: {data['message']}")
    else:
        print(f"❌ Logout failed: {response.status_code}")

    print("\n" + "=" * 50)
    print("🎉 Phase J Authentication Tests Complete!")


if __name__ == "__main__":
    test_auth_endpoints()
