"""
Integration tests for Enhanced Profile Features (Phase J2)
Tests avatar upload, data export, and advanced profile functionality
"""

from PIL import Image
import requests
import io
import time

BASE_URL = "http://localhost:8000"

class EnhancedProfileTestSuite:
    """Test suite for enhanced profile features including avatar upload and data export."""
    
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        
    def setup_test_user(self):
        """Set up a test user for enhanced profile testing."""
        print("\n🔧 Setting up test user for enhanced profile features...")
        
        # Register a new user
        user_data = {
            "email": f"enhanced_test_{int(time.time())}@example.com",
            "password": "enhancedtest123",
            "full_name": "Enhanced Test User",
            "username": f"enhanced_{int(time.time())}"
        }
        
        response = self.session.post(f"{BASE_URL}/api/auth/register", json=user_data)
        
        if response.status_code in [200, 201]:
            auth_data = response.json()
            self.auth_token = auth_data.get("tokens", {}).get("access_token")
            self.user_data = auth_data.get("user")
            print("✅ Test user set up successfully")
            return True
        else:
            print(f"❌ Test user setup failed: {response.status_code}")
            return False
    
    def create_test_avatar(self) -> io.BytesIO:
        """Create a test avatar image."""
        # Create a simple test image
        image = Image.new('RGB', (200, 200), color='blue')
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG')
        buffer.seek(0)
        return buffer
    
    def test_avatar_upload(self):
        """Test avatar upload functionality."""
        print("\n🧪 Test 1: Avatar Upload")
        print("-" * 50)
        
        if not self.auth_token:
            print("❌ No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Create test avatar
        avatar_buffer = self.create_test_avatar()
        
        # Prepare multipart form data
        files = {
            'avatar': ('test_avatar.jpg', avatar_buffer, 'image/jpeg')
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/api/profile/enhanced/avatar", 
                files=files, 
                headers=headers
            )
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Avatar upload successful")
                print(f"   Avatar URL: {result.get('avatar_url')}")
                print(f"   Message: {result.get('message')}")
                return True
            else:
                print(f"❌ Avatar upload failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Avatar upload error: {e}")
            return False
    
    def test_profile_statistics(self):
        """Test profile statistics endpoint."""
        print("\n🧪 Test 2: Profile Statistics")
        print("-" * 50)
        
        if not self.auth_token:
            print("❌ No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = self.session.get(
                f"{BASE_URL}/api/profile/enhanced/stats", 
                headers=headers
            )
            
            if response.status_code == 200:
                stats = response.json()
                print("✅ Profile statistics retrieved")
                print(f"   Profile Completeness: {stats.get('profile_completeness', 0)}%")
                print(f"   Activity Score: {stats.get('activity_score', 0)}")
                print(f"   Account Age: {stats.get('account_age_days', 0)} days")
                print(f"   Last Active: {stats.get('last_active_days_ago', 'N/A')} days ago")
                print(f"   Total Logins: {stats.get('total_logins', 0)}")
                return True
            else:
                print(f"❌ Profile statistics failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Profile statistics error: {e}")
            return False
    
    def test_data_export(self):
        """Test GDPR data export functionality."""
        print("\n🧪 Test 3: Data Export (GDPR)")
        print("-" * 50)
        
        if not self.auth_token:
            print("❌ No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = self.session.get(
                f"{BASE_URL}/api/profile/enhanced/export", 
                headers=headers
            )
            
            if response.status_code == 200:
                export_data = response.json()
                print("✅ Data export successful")
                print(f"   User Data: {bool(export_data.get('user'))}")
                print(f"   Profile Data: {bool(export_data.get('profile'))}")
                print(f"   Notification Preferences: {bool(export_data.get('notification_preferences'))}")
                print(f"   Export Timestamp: {export_data.get('export_timestamp')}")
                
                # Check data completeness
                user_data = export_data.get('user', {})
                profile_data = export_data.get('profile', {})
                
                print(f"   Exported Email: {user_data.get('email', 'Missing')}")
                print(f"   Exported Username: {profile_data.get('username', 'Missing')}")
                
                return True
            else:
                print(f"❌ Data export failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Data export error: {e}")
            return False
    
    def test_profile_validation_enhanced(self):
        """Test enhanced profile validation."""
        print("\n🧪 Test 4: Enhanced Profile Validation")
        print("-" * 50)
        
        if not self.auth_token:
            print("❌ No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test updating profile with enhanced validation
        test_cases = [
            {
                "name": "Valid bio with emojis",
                "data": {"bio": "Hello world! 👋 This is a test bio with emojis 🚀"},
                "should_pass": True
            },
            {
                "name": "Bio with URLs",
                "data": {"bio": "Check out my website: https://example.com"},
                "should_pass": True
            },
            {
                "name": "Display name with special chars",
                "data": {"display_name": "Test User™ ® ©"},
                "should_pass": True
            },
            {
                "name": "Empty display name",
                "data": {"display_name": ""},
                "should_pass": False
            }
        ]
        
        passed_tests = 0
        total_tests = len(test_cases)
        
        for test_case in test_cases:
            try:
                response = self.session.put(
                    f"{BASE_URL}/api/profile/enhanced/validate", 
                    json=test_case["data"], 
                    headers=headers
                )
                
                if test_case["should_pass"]:
                    if response.status_code == 200:
                        print(f"✅ {test_case['name']}: Passed validation")
                        passed_tests += 1
                    else:
                        print(f"❌ {test_case['name']}: Should have passed but didn't")
                else:
                    if response.status_code == 422:
                        print(f"✅ {test_case['name']}: Correctly rejected")
                        passed_tests += 1
                    else:
                        print(f"❌ {test_case['name']}: Should have been rejected but wasn't")
                        
            except Exception as e:
                print(f"❌ {test_case['name']}: Error - {e}")
        
        print(f"   Validation tests passed: {passed_tests}/{total_tests}")
        return passed_tests == total_tests
    
    def test_account_activity_tracking(self):
        """Test account activity tracking."""
        print("\n🧪 Test 5: Account Activity Tracking")
        print("-" * 50)
        
        if not self.auth_token:
            print("❌ No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            # Get activity summary
            response = self.session.get(
                f"{BASE_URL}/api/profile/enhanced/activity", 
                headers=headers
            )
            
            if response.status_code == 200:
                activity = response.json()
                print("✅ Activity tracking retrieved")
                print(f"   Last Login: {activity.get('last_login')}")
                print(f"   Login Count: {activity.get('login_count', 0)}")
                print(f"   Profile Updates: {activity.get('profile_updates', 0)}")
                print(f"   Settings Changes: {activity.get('settings_changes', 0)}")
                print(f"   Created At: {activity.get('created_at')}")
                return True
            else:
                print(f"❌ Activity tracking failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Activity tracking error: {e}")
            return False
    
    def test_avatar_image_processing(self):
        """Test avatar image processing and validation."""
        print("\n🧪 Test 6: Avatar Image Processing")
        print("-" * 50)
        
        if not self.auth_token:
            print("❌ No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test different image formats and sizes
        test_images = [
            {
                "name": "Large JPEG",
                "size": (1000, 1000),
                "format": "JPEG",
                "should_pass": True
            },
            {
                "name": "Small PNG", 
                "size": (100, 100),
                "format": "PNG",
                "should_pass": True
            },
            {
                "name": "Huge image",
                "size": (5000, 5000),
                "format": "JPEG", 
                "should_pass": False  # Should be rejected for being too large
            }
        ]
        
        passed_tests = 0
        total_tests = len(test_images)
        
        for test_img in test_images:
            try:
                # Create test image
                image = Image.new('RGB', test_img["size"], color='red')
                buffer = io.BytesIO()
                image.save(buffer, format=test_img["format"])
                buffer.seek(0)
                
                files = {
                    'avatar': (f'test.{test_img["format"].lower()}', buffer, f'image/{test_img["format"].lower()}')
                }
                
                response = self.session.post(
                    f"{BASE_URL}/api/profile/enhanced/avatar", 
                    files=files, 
                    headers=headers
                )
                
                if test_img["should_pass"]:
                    if response.status_code == 200:
                        print(f"✅ {test_img['name']}: Processed successfully")
                        passed_tests += 1
                    else:
                        print(f"❌ {test_img['name']}: Should have been processed")
                else:
                    if response.status_code != 200:
                        print(f"✅ {test_img['name']}: Correctly rejected")
                        passed_tests += 1
                    else:
                        print(f"❌ {test_img['name']}: Should have been rejected")
                        
            except Exception as e:
                print(f"❌ {test_img['name']}: Error - {e}")
        
        print(f"   Image processing tests passed: {passed_tests}/{total_tests}")
        return passed_tests == total_tests
    
    def run_enhanced_tests(self):
        """Run all enhanced profile feature tests."""
        print("🚀 Enhanced Profile Features Test Suite (Phase J2)")
        print("=" * 60)
        
        # Setup test user first
        if not self.setup_test_user():
            print("❌ Could not set up test user, aborting tests")
            return 0, 1
        
        tests = [
            self.test_avatar_upload,
            self.test_profile_statistics,
            self.test_data_export,
            self.test_profile_validation_enhanced,
            self.test_account_activity_tracking,
            self.test_avatar_image_processing
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
        
        print("\n" + "=" * 60)
        print("📊 Enhanced Features Test Results")
        print("-" * 35)
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed / (passed + failed)) * 100:.1f}%")
        
        if passed > failed:
            print("\n🎉 Enhanced Profile Features: WORKING WELL!")
        else:
            print("\n⚠️  Enhanced Profile Features: NEED DEBUGGING")
        
        return passed, failed


def run_enhanced_profile_tests():
    """Main function to run enhanced profile tests."""
    test_suite = EnhancedProfileTestSuite()
    return test_suite.run_enhanced_tests()


if __name__ == "__main__":
    run_enhanced_profile_tests()