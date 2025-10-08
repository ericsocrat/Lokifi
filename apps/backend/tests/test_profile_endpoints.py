"""
Test script for Phase J2 Profile & Settings endpoints.
"""

import requests

BASE_URL = "http://localhost:8000"


def test_profile_endpoints():
    print("🧪 Testing Phase J2 Profile & Settings Endpoints")
    print("=" * 60)
    
    # Step 1: Register a user first
    print("\n📝 Step 1: Register a test user...")
    user_data = {
        "email": "profiletest@example.com",
        "password": "testpassword123",
        "full_name": "Profile Test User",
        "username": "profiletester"
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
    if response.status_code in [200, 201]:
        print("✅ User registration successful")
        cookies = response.cookies
    elif response.status_code == 409:
        print("ℹ️  User already exists, logging in...")
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            print("✅ User login successful")
            cookies = response.cookies
        else:
            print(f"❌ Login failed: {response.status_code}")
            return
    else:
        print(f"❌ Registration failed: {response.status_code}")
        return
    
    # Step 2: Get my profile
    print("\n👤 Step 2: Get current user profile...")
    response = requests.get(f"{BASE_URL}/api/profile/me", cookies=cookies)
    if response.status_code == 200:
        profile_data = response.json()
        print("✅ Get profile successful")
        print(f"   Username: {profile_data['username']}")
        print(f"   Display Name: {profile_data['display_name']}")
        print(f"   Bio: {profile_data['bio'] or 'No bio'}")
        print(f"   Public: {profile_data['is_public']}")
        profile_id = profile_data['id']
    else:
        print(f"❌ Get profile failed: {response.status_code} - {response.text}")
        return
    
    # Step 3: Update profile
    print("\n📝 Step 3: Update profile...")
    profile_update = {
        "display_name": "Updated Profile Test User",
        "bio": "This is my test bio for Phase J2!",
        "is_public": True
    }
    
    response = requests.put(f"{BASE_URL}/api/profile/me", json=profile_update, cookies=cookies)
    if response.status_code == 200:
        updated_profile = response.json()
        print("✅ Profile update successful")
        print(f"   New Display Name: {updated_profile['display_name']}")
        print(f"   New Bio: {updated_profile['bio']}")
    else:
        print(f"❌ Profile update failed: {response.status_code} - {response.text}")
    
    # Step 4: Get user settings
    print("\n⚙️ Step 4: Get user settings...")
    response = requests.get(f"{BASE_URL}/api/profile/settings/user", cookies=cookies)
    if response.status_code == 200:
        settings_data = response.json()
        print("✅ Get user settings successful")
        print(f"   Full Name: {settings_data['full_name']}")
        print(f"   Email: {settings_data['email']}")
        print(f"   Timezone: {settings_data['timezone'] or 'Not set'}")
        print(f"   Language: {settings_data['language'] or 'Not set'}")
    else:
        print(f"❌ Get user settings failed: {response.status_code} - {response.text}")
    
    # Step 5: Update user settings
    print("\n⚙️ Step 5: Update user settings...")
    settings_update = {
        "full_name": "Updated Profile Test User",
        "timezone": "America/New_York",
        "language": "en"
    }
    
    response = requests.put(f"{BASE_URL}/api/profile/settings/user", json=settings_update, cookies=cookies)
    if response.status_code == 200:
        updated_settings = response.json()
        print("✅ User settings update successful")
        print(f"   Updated Full Name: {updated_settings['full_name']}")
        print(f"   Updated Timezone: {updated_settings['timezone']}")
        print(f"   Updated Language: {updated_settings['language']}")
    else:
        print(f"❌ User settings update failed: {response.status_code} - {response.text}")
    
    # Step 6: Get notification preferences
    print("\n🔔 Step 6: Get notification preferences...")
    response = requests.get(f"{BASE_URL}/api/profile/settings/notifications", cookies=cookies)
    if response.status_code == 200:
        notif_prefs = response.json()
        print("✅ Get notification preferences successful")
        print(f"   Email Enabled: {notif_prefs['email_enabled']}")
        print(f"   Email Follows: {notif_prefs['email_follows']}")
        print(f"   Push Enabled: {notif_prefs['push_enabled']}")
    else:
        print(f"❌ Get notification preferences failed: {response.status_code} - {response.text}")
    
    # Step 7: Update notification preferences
    print("\n🔔 Step 7: Update notification preferences...")
    notif_update = {
        "email_follows": False,
        "email_messages": True,
        "push_enabled": False
    }
    
    response = requests.put(f"{BASE_URL}/api/profile/settings/notifications", json=notif_update, cookies=cookies)
    if response.status_code == 200:
        updated_notif = response.json()
        print("✅ Notification preferences update successful")
        print(f"   Updated Email Follows: {updated_notif['email_follows']}")
        print(f"   Updated Email Messages: {updated_notif['email_messages']}")
        print(f"   Updated Push Enabled: {updated_notif['push_enabled']}")
    else:
        print(f"❌ Notification preferences update failed: {response.status_code} - {response.text}")
    
    # Step 8: Get public profile by ID (without auth)
    print("\n🌐 Step 8: Get public profile by ID...")
    response = requests.get(f"{BASE_URL}/api/profile/{profile_id}")
    if response.status_code == 200:
        public_profile = response.json()
        print("✅ Get public profile successful")
        print(f"   Display Name: {public_profile['display_name']}")
        print(f"   Bio: {public_profile['bio']}")
        print(f"   Public: {public_profile['is_public']}")
        print(f"   Following Status: {public_profile['is_following']}")
    else:
        print(f"❌ Get public profile failed: {response.status_code} - {response.text}")
    
    # Step 9: Get profile by username
    print("\n🌐 Step 9: Get profile by username...")
    response = requests.get(f"{BASE_URL}/api/profile/username/{user_data['username']}")
    if response.status_code == 200:
        profile_by_username = response.json()
        print("✅ Get profile by username successful")
        print(f"   Username: {profile_by_username['username']}")
        print(f"   Display Name: {profile_by_username['display_name']}")
    else:
        print(f"❌ Get profile by username failed: {response.status_code} - {response.text}")
    
    # Step 10: Search profiles
    print("\n🔍 Step 10: Search profiles...")
    response = requests.get(f"{BASE_URL}/api/profile?q=test")
    if response.status_code == 200:
        search_results = response.json()
        print("✅ Profile search successful")
        print(f"   Total Results: {search_results['total']}")
        print(f"   Profiles Found: {len(search_results['profiles'])}")
        if search_results['profiles']:
            first_profile = search_results['profiles'][0]
            print(f"   First Result: {first_profile['display_name']} (@{first_profile['username']})")
    else:
        print(f"❌ Profile search failed: {response.status_code} - {response.text}")
    
    print("\n" + "=" * 60)
    print("🎉 Phase J2 Profile & Settings Tests Complete!")
    
    return cookies  # Return cookies for potential J3 tests


if __name__ == "__main__":
    test_profile_endpoints()