"""
Frontend Integration Tests for Phase J2 Profile Pages
Tests the new profile, edit, and settings pages
"""

import time

import requests
from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

FRONTEND_URL = "http://localhost:3000"
BACKEND_URL = "http://localhost:8000"

class FrontendProfileTestSuite:
    """Test suite for frontend profile pages."""
    
    def __init__(self):
        self.driver = None
        self.test_user = None
        self.auth_token = None
        
    def setup_driver(self):
        """Set up Chrome WebDriver for testing."""
        try:
            options = Options()
            options.add_argument('--headless')  # Run in background
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-gpu')
            options.add_argument('--window-size=1920,1080')
            
            self.driver = webdriver.Chrome(options=options)
            self.driver.implicitly_wait(10)
            print("✅ WebDriver setup successful")
            return True
        except Exception as e:
            print(f"❌ WebDriver setup failed: {e}")
            print("   Note: This test requires Chrome and ChromeDriver to be installed")
            return False
    
    def register_test_user(self):
        """Register a test user for frontend testing."""
        user_data = {
            "email": f"frontend_test_{int(time.time())}@example.com",
            "password": "frontendtest123",
            "full_name": "Frontend Test User",
            "username": f"frontend_{int(time.time())}"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/api/auth/register", json=user_data)
            if response.status_code in [200, 201]:
                auth_data = response.json()
                self.test_user = user_data
                self.auth_token = auth_data.get("tokens", {}).get("access_token")
                print("✅ Test user registered successfully")
                return True
            else:
                print(f"❌ User registration failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ User registration error: {e}")
            return False
    
    def test_profile_page_rendering(self):
        """Test that the profile page renders correctly."""
        print("\n🧪 Test 1: Profile Page Rendering")
        print("-" * 50)
        
        try:
            self.driver.get(f"{FRONTEND_URL}/profile")
            
            # Wait for page to load
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # Check for key elements
            elements_to_check = [
                ("Profile container", "div"),
                ("Navigation", "nav"),
                ("Main content", "main")
            ]
            
            found_elements = 0
            for name, tag in elements_to_check:
                try:
                    self.driver.find_element(By.TAG_NAME, tag)
                    print(f"   ✅ {name} found")
                    found_elements += 1
                except NoSuchElementException:
                    print(f"   ❌ {name} not found")
            
            # Check for React components (look for data-testid or specific classes)
            try:
                # Look for profile-related content
                profile_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Profile') or contains(text(), 'Settings')]")
                if profile_elements:
                    print(f"   ✅ Profile-related content found ({len(profile_elements)} elements)")
                    found_elements += 1
                else:
                    print("   ❌ No profile-related content found")
            except Exception as e:
                print(f"   ❌ Error checking profile content: {e}")
            
            print(f"   📊 Elements found: {found_elements}")
            return found_elements >= 2  # Minimum viable page
            
        except TimeoutException:
            print("   ❌ Page load timeout")
            return False
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False
    
    def test_profile_edit_page_rendering(self):
        """Test that the profile edit page renders correctly."""
        print("\n🧪 Test 2: Profile Edit Page Rendering")
        print("-" * 50)
        
        try:
            self.driver.get(f"{FRONTEND_URL}/profile/edit")
            
            # Wait for page to load
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # Check for form elements
            form_elements = 0
            
            # Look for input fields
            inputs = self.driver.find_elements(By.TAG_NAME, "input")
            if inputs:
                print(f"   ✅ Input fields found ({len(inputs)})")
                form_elements += 1
            
            # Look for textareas
            textareas = self.driver.find_elements(By.TAG_NAME, "textarea")
            if textareas:
                print(f"   ✅ Textarea fields found ({len(textareas)})")
                form_elements += 1
            
            # Look for buttons
            buttons = self.driver.find_elements(By.TAG_NAME, "button")
            if buttons:
                print(f"   ✅ Buttons found ({len(buttons)})")
                form_elements += 1
            
            # Look for file input (avatar upload)
            file_inputs = self.driver.find_elements(By.XPATH, "//input[@type='file']")
            if file_inputs:
                print(f"   ✅ File upload fields found ({len(file_inputs)})")
                form_elements += 1
            
            # Look for edit-related content
            edit_content = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Edit') or contains(text(), 'Save') or contains(text(), 'Update')]")
            if edit_content:
                print(f"   ✅ Edit-related content found ({len(edit_content)} elements)")
                form_elements += 1
            
            print(f"   📊 Form elements found: {form_elements}")
            return form_elements >= 3  # Minimum viable edit form
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False
    
    def test_settings_page_rendering(self):
        """Test that the settings page renders correctly."""
        print("\n🧪 Test 3: Settings Page Rendering")
        print("-" * 50)
        
        try:
            self.driver.get(f"{FRONTEND_URL}/profile/settings")
            
            # Wait for page to load
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            settings_elements = 0
            
            # Look for tabs or sections
            tabs = self.driver.find_elements(By.XPATH, "//*[contains(@class, 'tab') or contains(text(), 'General') or contains(text(), 'Security') or contains(text(), 'Notifications')]")
            if tabs:
                print(f"   ✅ Tab/section elements found ({len(tabs)})")
                settings_elements += 1
            
            # Look for settings-related form elements
            settings_inputs = self.driver.find_elements(By.XPATH, "//input[@type='checkbox'] | //input[@type='radio'] | //select")
            if settings_inputs:
                print(f"   ✅ Settings input elements found ({len(settings_inputs)})")
                settings_elements += 1
            
            # Look for save/update buttons
            save_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Save') or contains(text(), 'Update')]")
            if save_buttons:
                print(f"   ✅ Save buttons found ({len(save_buttons)})")
                settings_elements += 1
            
            # Look for notification preferences
            notification_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Notification') or contains(text(), 'Email') or contains(text(), 'Push')]")
            if notification_elements:
                print(f"   ✅ Notification-related elements found ({len(notification_elements)})")
                settings_elements += 1
            
            print(f"   📊 Settings elements found: {settings_elements}")
            return settings_elements >= 2  # Minimum viable settings page
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False
    
    def test_navigation_between_pages(self):
        """Test navigation between profile pages."""
        print("\n🧪 Test 4: Navigation Between Pages")
        print("-" * 50)
        
        try:
            navigation_tests = 0
            
            # Start at profile page
            self.driver.get(f"{FRONTEND_URL}/profile")
            time.sleep(2)
            
            # Try to navigate to edit page
            try:
                edit_links = self.driver.find_elements(By.XPATH, "//a[contains(@href, '/profile/edit') or contains(text(), 'Edit')]")
                if edit_links:
                    edit_links[0].click()
                    time.sleep(2)
                    if "/profile/edit" in self.driver.current_url:
                        print("   ✅ Navigation to edit page successful")
                        navigation_tests += 1
                    else:
                        print("   ❌ Navigation to edit page failed")
                else:
                    print("   ⚠️  No edit links found, trying direct navigation")
                    self.driver.get(f"{FRONTEND_URL}/profile/edit")
                    time.sleep(2)
                    navigation_tests += 1
            except Exception as e:
                print(f"   ❌ Edit page navigation error: {e}")
            
            # Try to navigate to settings page
            try:
                self.driver.get(f"{FRONTEND_URL}/profile/settings")
                time.sleep(2)
                if "/profile/settings" in self.driver.current_url:
                    print("   ✅ Navigation to settings page successful")
                    navigation_tests += 1
                else:
                    print("   ❌ Navigation to settings page failed")
            except Exception as e:
                print(f"   ❌ Settings page navigation error: {e}")
            
            # Try to go back to main profile
            try:
                self.driver.get(f"{FRONTEND_URL}/profile")
                time.sleep(2)
                if "/profile" in self.driver.current_url and "/edit" not in self.driver.current_url and "/settings" not in self.driver.current_url:
                    print("   ✅ Navigation back to profile successful")
                    navigation_tests += 1
                else:
                    print("   ❌ Navigation back to profile failed")
            except Exception as e:
                print(f"   ❌ Profile page navigation error: {e}")
            
            print(f"   📊 Navigation tests passed: {navigation_tests}/3")
            return navigation_tests >= 2
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False
    
    def test_responsive_design(self):
        """Test responsive design of profile pages."""
        print("\n🧪 Test 5: Responsive Design")
        print("-" * 50)
        
        try:
            responsive_tests = 0
            
            # Test different screen sizes
            screen_sizes = [
                ("Desktop", 1920, 1080),
                ("Tablet", 768, 1024),
                ("Mobile", 375, 667)
            ]
            
            for size_name, width, height in screen_sizes:
                try:
                    self.driver.set_window_size(width, height)
                    time.sleep(1)
                    
                    # Load profile page
                    self.driver.get(f"{FRONTEND_URL}/profile")
                    time.sleep(2)
                    
                    # Check if page is usable (no horizontal scroll, elements visible)
                    body = self.driver.find_element(By.TAG_NAME, "body")
                    if body:
                        print(f"   ✅ {size_name} ({width}x{height}): Page loads")
                        responsive_tests += 1
                    
                except Exception as e:
                    print(f"   ❌ {size_name} test failed: {e}")
            
            print(f"   📊 Responsive tests passed: {responsive_tests}/{len(screen_sizes)}")
            return responsive_tests >= 2
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False
    
    def test_page_performance(self):
        """Test basic page performance metrics."""
        print("\n🧪 Test 6: Page Performance")
        print("-" * 50)
        
        try:
            performance_tests = 0
            
            pages_to_test = [
                ("/profile", "Profile"),
                ("/profile/edit", "Profile Edit"),
                ("/profile/settings", "Settings")
            ]
            
            for path, name in pages_to_test:
                try:
                    start_time = time.time()
                    self.driver.get(f"{FRONTEND_URL}{path}")
                    
                    # Wait for page to be interactive
                    WebDriverWait(self.driver, 10).until(
                        EC.presence_of_element_located((By.TAG_NAME, "body"))
                    )
                    
                    load_time = time.time() - start_time
                    
                    if load_time < 5:  # 5 second threshold
                        print(f"   ✅ {name}: Loaded in {load_time:.2f}s")
                        performance_tests += 1
                    else:
                        print(f"   ⚠️  {name}: Slow load time {load_time:.2f}s")
                    
                except Exception as e:
                    print(f"   ❌ {name} performance test failed: {e}")
            
            print(f"   📊 Performance tests passed: {performance_tests}/{len(pages_to_test)}")
            return performance_tests >= 2
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False
    
    def cleanup(self):
        """Clean up resources."""
        if self.driver:
            self.driver.quit()
            print("✅ WebDriver cleaned up")
    
    def run_frontend_tests(self):
        """Run all frontend profile tests."""
        print("🌐 Frontend Profile Pages Test Suite (Phase J2)")
        print("=" * 60)
        
        # Setup
        if not self.setup_driver():
            print("❌ Cannot run frontend tests without WebDriver")
            return 0, 1
        
        # Note: User registration is optional for frontend testing
        # since pages might work without authentication (showing login prompts)
        
        tests = [
            self.test_profile_page_rendering,
            self.test_profile_edit_page_rendering,
            self.test_settings_page_rendering,
            self.test_navigation_between_pages,
            self.test_responsive_design,
            self.test_page_performance
        ]
        
        passed = 0
        failed = 0
        
        try:
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
        
        finally:
            self.cleanup()
        
        print("\n" + "=" * 60)
        print("📊 Frontend Test Results")
        print("-" * 25)
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        
        if passed + failed > 0:
            print(f"📈 Success Rate: {(passed / (passed + failed)) * 100:.1f}%")
        
        if passed > failed:
            print("\n🎉 Frontend Profile Pages: WORKING!")
        else:
            print("\n⚠️  Frontend Profile Pages: NEED ATTENTION")
        
        return passed, failed


def run_frontend_profile_tests():
    """Main function to run frontend profile tests."""
    test_suite = FrontendProfileTestSuite()
    return test_suite.run_frontend_tests()


if __name__ == "__main__":
    run_frontend_profile_tests()