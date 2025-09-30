"""
Comprehensive test suite for Phase J2 - User Profiles & Settings
Tests both backend API endpoints and frontend integration
"""

import time

import requests

BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

class ProfileTestSuite:
    """Comprehensive test suite for profile and settings functionality."""
    
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.profile_data = None
        
    def test_user_registration_and_profile_creation(self):
        """Test user registration creates profile automatically."""
        print("\n🧪 Test 1: User Registration and Profile Creation")
        print("-" * 60)
        
        # Register a new user
        user_data = {
            "email": f"test_{int(time.time())}@example.com",
            "password": "testpassword123",
            "full_name": "Test User",
            "username": f"testuser_{int(time.time())}"
        }
        
        response = self.session.post(f"{BASE_URL}/api/auth/register", json=user_data)
        
        if response.status_code in [200, 201]:
            print("✅ User registration successful")
            auth_data = response.json()
            self.auth_token = auth_data.get("tokens", {}).get("access_token")
            self.user_data = auth_data.get("user")
            self.profile_data = auth_data.get("profile")
            
            # Verify profile was created
            if self.profile_data:
                print(f"✅ Profile created automatically: @{self.profile_data.get('username')}")
                print(f"   Display Name: {self.profile_data.get('display_name')}")
                print(f"   Is Public: {self.profile_data.get('is_public')}")
            else:
                print("❌ Profile not created during registration")
                return False
                
        else:
            print(f"❌ Registration failed: {response.status_code} - {response.text}")
            return False
        
        return True
    
    def test_profile_retrieval(self):
        """Test getting current user's profile."""
        print("\n🧪 Test 2: Profile Retrieval")
        print("-" * 60)
        
        if not self.auth_token:
            print("❌ No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response = self.session.get(f"{BASE_URL}/api/profile/me", headers=headers)
        
        if response.status_code == 200:
            profile = response.json()
            print("✅ Profile retrieval successful")
            print(f"   ID: {profile.get('id')}")
            print(f"   Username: @{profile.get('username')}")
            print(f"   Display Name: {profile.get('display_name')}")
            print(f"   Bio: {profile.get('bio') or 'Not set'}")
            print(f"   Public: {profile.get('is_public')}")
            print(f"   Followers: {profile.get('follower_count', 0)}")
            print(f"   Following: {profile.get('following_count', 0)}")
            return True
        else:
            print(f"❌ Profile retrieval failed: {response.status_code} - {response.text}")
            return False
    
    def test_profile_update(self):
        """Test updating profile information."""
        print("\n🧪 Test 3: Profile Update")
        print("-" * 60)
        
        if not self.auth_token:
            print("❌ No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Update profile with new information
        update_data = {
            "display_name": "Updated Test User",
            "bio": "This is my updated bio for Phase J2 testing! 🚀",
            "is_public": True
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/profile/me", 
            json=update_data, 
            headers=headers
        )
        
        if response.status_code == 200:
            updated_profile = response.json()
            print("✅ Profile update successful")
            print(f"   New Display Name: {updated_profile.get('display_name')}")
            print(f"   New Bio: {updated_profile.get('bio')}")
            print(f"   Public: {updated_profile.get('is_public')}")
            
            # Verify the update by fetching profile again
            verify_response = self.session.get(f"{BASE_URL}/api/profile/me", headers=headers)
            if verify_response.status_code == 200:
                verified_profile = verify_response.json()
                if verified_profile.get('bio') == update_data['bio']:
                    print("✅ Profile update verified")
                    return True
                else:
                    print("❌ Profile update not persisted")
                    return False
            else:
                print("❌ Could not verify profile update")
                return False
        else:
            print(f"❌ Profile update failed: {response.status_code} - {response.text}")
            return False
    
    def test_user_settings_management(self):
        """Test user settings retrieval and update."""
        print("\n🧪 Test 4: User Settings Management")
        print("-" * 60)
        
        if not self.auth_token:
            print("❌ No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Get current settings
        response = self.session.get(f"{BASE_URL}/api/profile/settings/user", headers=headers)
        
        if response.status_code == 200:
            settings = response.json()
            print("✅ Settings retrieval successful")
            print(f"   Full Name: {settings.get('full_name')}")
            print(f"   Email: {settings.get('email')}")
            print(f"   Timezone: {settings.get('timezone') or 'Not set'}")
            print(f"   Language: {settings.get('language')}")
            print(f"   Verified: {settings.get('is_verified')}")
            print(f"   Active: {settings.get('is_active')}")
        else:
            print(f"❌ Settings retrieval failed: {response.status_code} - {response.text}")
            return False
        
        # Update settings
        settings_update = {
            "full_name": "Updated Full Name",
            "timezone": "America/New_York",
            "language": "en"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/profile/settings/user", 
            json=settings_update, 
            headers=headers
        )
        
        if response.status_code == 200:
            updated_settings = response.json()
            print("✅ Settings update successful")
            print(f"   New Full Name: {updated_settings.get('full_name')}")
            print(f"   New Timezone: {updated_settings.get('timezone')}")
            print(f"   New Language: {updated_settings.get('language')}")
            return True
        else:
            print(f"❌ Settings update failed: {response.status_code} - {response.text}")
            return False
    
    def test_notification_preferences(self):
        """Test notification preferences management."""
        print("\n🧪 Test 5: Notification Preferences")
        print("-" * 60)
        
        if not self.auth_token:
            print("❌ No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Get current notification preferences
        response = self.session.get(f"{BASE_URL}/api/profile/settings/notifications", headers=headers)
        
        if response.status_code == 200:
            prefs = response.json()
            print("✅ Notification preferences retrieval successful")
            print(f"   Email Enabled: {prefs.get('email_enabled')}")
            print(f"   Email Follows: {prefs.get('email_follows')}")
            print(f"   Email Messages: {prefs.get('email_messages')}")
            print(f"   Push Enabled: {prefs.get('push_enabled')}")
            print(f"   Push Follows: {prefs.get('push_follows')}")
        else:
            print(f"❌ Notification preferences retrieval failed: {response.status_code} - {response.text}")
            return False
        
        # Update notification preferences
        prefs_update = {
            "email_enabled": True,
            "email_follows": True,
            "email_messages": False,
            "email_ai_responses": True,
            "push_enabled": True,
            "push_follows": False,
            "push_messages": True
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/profile/settings/notifications", 
            json=prefs_update, 
            headers=headers
        )
        
        if response.status_code == 200:
            updated_prefs = response.json()
            print("✅ Notification preferences update successful")
            print(f"   Email Follows: {updated_prefs.get('email_follows')}")
            print(f"   Email Messages: {updated_prefs.get('email_messages')}")
            print(f"   Push Messages: {updated_prefs.get('push_messages')}")
            return True
        else:
            print(f"❌ Notification preferences update failed: {response.status_code} - {response.text}")
            return False
    
    def test_profile_search(self):
        """Test profile search functionality."""
        print("\n🧪 Test 6: Profile Search")
        print("-" * 60)
        
        # Search without authentication (public search)
        response = self.session.get(f"{BASE_URL}/api/profile?q=test&page=1&page_size=10")
        
        if response.status_code == 200:
            search_results = response.json()
            print("✅ Profile search successful")
            print(f"   Total Results: {search_results.get('total', 0)}")
            print(f"   Page: {search_results.get('page')}")
            print(f"   Page Size: {search_results.get('page_size')}")
            print(f"   Has Next: {search_results.get('has_next')}")
            
            profiles = search_results.get('profiles', [])
            for i, profile in enumerate(profiles[:3]):  # Show first 3 results
                print(f"   Result {i+1}: @{profile.get('username')} - {profile.get('display_name')}")
            
            return True
        else:
            print(f"❌ Profile search failed: {response.status_code} - {response.text}")
            return False
    
    def test_profile_validation(self):
        """Test profile validation and error handling."""
        print("\n🧪 Test 7: Profile Validation")
        print("-" * 60)
        
        if not self.auth_token:
            print("❌ No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test invalid username (too short)
        invalid_data = {
            "username": "ab",  # Too short
            "display_name": "Valid Name"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/profile/me", 
            json=invalid_data, 
            headers=headers
        )
        
        if response.status_code == 422:
            print("✅ Username validation working (too short rejected)")
        else:
            print(f"❌ Username validation failed: {response.status_code}")
            return False
        
        # Test invalid username (invalid characters)
        invalid_data = {
            "username": "test@user!",  # Invalid characters
            "display_name": "Valid Name"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/profile/me", 
            json=invalid_data, 
            headers=headers
        )
        
        if response.status_code == 422:
            print("✅ Username validation working (invalid characters rejected)")
        else:
            print(f"❌ Username validation failed: {response.status_code}")
            return False
        
        # Test bio too long
        invalid_data = {
            "bio": "x" * 501  # Too long
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/profile/me", 
            json=invalid_data, 
            headers=headers
        )
        
        if response.status_code == 422:
            print("✅ Bio length validation working (too long rejected)")
            return True
        else:
            print(f"❌ Bio validation failed: {response.status_code}")
            return False
    
    def test_privacy_controls(self):
        """Test profile privacy controls."""
        print("\n🧪 Test 8: Privacy Controls")
        print("-" * 60)
        
        if not self.auth_token:
            print("❌ No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Make profile private
        privacy_update = {"is_public": False}
        response = self.session.put(
            f"{BASE_URL}/api/profile/me", 
            json=privacy_update, 
            headers=headers
        )
        
        if response.status_code == 200:
            profile = response.json()
            if not profile.get('is_public'):
                print("✅ Profile privacy set to private")
            else:
                print("❌ Profile privacy update failed")
                return False
        else:
            print(f"❌ Privacy update failed: {response.status_code}")
            return False
        
        # Make profile public again
        privacy_update = {"is_public": True}
        response = self.session.put(
            f"{BASE_URL}/api/profile/me", 
            json=privacy_update, 
            headers=headers
        )
        
        if response.status_code == 200:
            profile = response.json()
            if profile.get('is_public'):
                print("✅ Profile privacy set to public")
                return True
            else:
                print("❌ Profile privacy update failed")
                return False
        else:
            print(f"❌ Privacy update failed: {response.status_code}")
            return False
    
    def test_frontend_accessibility(self):
        """Test frontend pages accessibility."""
        print("\n🧪 Test 9: Frontend Page Accessibility")
        print("-" * 60)
        
        try:
            # Test profile page
            response = requests.get(f"{FRONTEND_URL}/profile", timeout=5)
            if response.status_code == 200:
                print("✅ Profile page accessible")
            else:
                print(f"❌ Profile page not accessible: {response.status_code}")
        except Exception as e:
            print(f"❌ Profile page test failed: {e}")
        
        try:
            # Test profile edit page
            response = requests.get(f"{FRONTEND_URL}/profile/edit", timeout=5)
            if response.status_code == 200:
                print("✅ Profile edit page accessible")
            else:
                print(f"❌ Profile edit page not accessible: {response.status_code}")
        except Exception as e:
            print(f"❌ Profile edit page test failed: {e}")
        
        try:
            # Test settings page
            response = requests.get(f"{FRONTEND_URL}/profile/settings", timeout=5)
            if response.status_code == 200:
                print("✅ Settings page accessible")
            else:
                print(f"❌ Settings page not accessible: {response.status_code}")
        except Exception as e:
            print(f"❌ Settings page test failed: {e}")
        
        try:
            # Test notification preferences page
            response = requests.get(f"{FRONTEND_URL}/notifications/preferences", timeout=5)
            if response.status_code == 200:
                print("✅ Notification preferences page accessible")
                return True
            else:
                print(f"❌ Notification preferences page not accessible: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Notification preferences page test failed: {e}")
            return False
    
    def run_all_tests(self):
        """Run all profile and settings tests."""
        print("🎯 Phase J2 - User Profiles & Settings Test Suite")
        print("=" * 70)
        
        tests = [
            self.test_user_registration_and_profile_creation,
            self.test_profile_retrieval,
            self.test_profile_update,
            self.test_user_settings_management,
            self.test_notification_preferences,
            self.test_profile_search,
            self.test_profile_validation,
            self.test_privacy_controls,
            self.test_frontend_accessibility
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            try:
                if test():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ Test failed with exception: {e}")
                failed += 1
            
            # Small delay between tests
            time.sleep(0.5)
        
        print("\n" + "=" * 70)
        print("📊 Test Results Summary")
        print("-" * 30)
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed / (passed + failed)) * 100:.1f}%")
        
        if passed > failed:
            print("\n🎉 Phase J2 User Profiles & Settings: MOSTLY WORKING!")
        else:
            print("\n⚠️  Phase J2 User Profiles & Settings: NEEDS ATTENTION")
        
        return passed, failed


def run_comprehensive_profile_tests():
    """Main function to run comprehensive profile tests."""
    test_suite = ProfileTestSuite()
    return test_suite.run_all_tests()


if __name__ == "__main__":
    run_comprehensive_profile_tests()