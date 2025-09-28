"""
Test script for Phase J3 Follow Graph endpoints.
"""

import requests
import json

BASE_URL = "http://localhost:8000"


def create_test_user(email: str, username: str, full_name: str):
    """Helper to create or login a test user."""
    user_data = {
        "email": email,
        "password": "testpassword123",
        "full_name": full_name,
        "username": username
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
    if response.status_code in [200, 201]:
        return response.cookies
    elif response.status_code == 409:
        # User exists, try login
        login_data = {
            "email": email,
            "password": "testpassword123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            return response.cookies
    
    return None


def test_follow_graph():
    print("🧪 Testing Phase J3 Follow Graph Endpoints")
    print("=" * 60)
    
    # Step 1: Create test users
    print("\n👥 Step 1: Create test users...")
    
    # Main user (Alice)
    alice_cookies = create_test_user(
        "alice@example.com", 
        "alice_test", 
        "Alice Test User"
    )
    if not alice_cookies:
        print("❌ Failed to create Alice")
        return
    print("✅ Alice created/logged in")
    
    # Bob
    bob_cookies = create_test_user(
        "bob@example.com",
        "bob_test", 
        "Bob Test User"
    )
    if not bob_cookies:
        print("❌ Failed to create Bob")
        return
    print("✅ Bob created/logged in")
    
    # Charlie
    charlie_cookies = create_test_user(
        "charlie@example.com",
        "charlie_test",
        "Charlie Test User" 
    )
    if not charlie_cookies:
        print("❌ Failed to create Charlie")
        return
    print("✅ Charlie created/logged in")
    
    # Get user profiles to get IDs
    alice_profile = requests.get(f"{BASE_URL}/api/profile/me", cookies=alice_cookies).json()
    bob_profile = requests.get(f"{BASE_URL}/api/profile/me", cookies=bob_cookies).json()
    charlie_profile = requests.get(f"{BASE_URL}/api/profile/me", cookies=charlie_cookies).json()
    
    alice_user_id = alice_profile['user_id']
    bob_user_id = bob_profile['user_id']
    charlie_user_id = charlie_profile['user_id']
    
    print(f"   Alice ID: {alice_user_id}")
    print(f"   Bob ID: {bob_user_id}")
    print(f"   Charlie ID: {charlie_user_id}")
    
    # Step 2: Follow relationships
    print("\n💫 Step 2: Test follow functionality...")
    
    # Alice follows Bob
    follow_data = {"user_id": bob_user_id}
    response = requests.post(f"{BASE_URL}/api/follow/follow", json=follow_data, cookies=alice_cookies)
    if response.status_code == 200:
        follow_result = response.json()
        print("✅ Alice follows Bob")
        print(f"   Follow ID: {follow_result['id']}")
    else:
        print(f"❌ Alice -> Bob follow failed: {response.status_code} - {response.text}")
    
    # Bob follows Charlie
    follow_data = {"user_id": charlie_user_id}
    response = requests.post(f"{BASE_URL}/api/follow/follow", json=follow_data, cookies=bob_cookies)
    if response.status_code == 200:
        print("✅ Bob follows Charlie")
    else:
        print(f"❌ Bob -> Charlie follow failed: {response.status_code} - {response.text}")
    
    # Charlie follows Alice (mutual follow)
    follow_data = {"user_id": alice_user_id}
    response = requests.post(f"{BASE_URL}/api/follow/follow", json=follow_data, cookies=charlie_cookies)
    if response.status_code == 200:
        print("✅ Charlie follows Alice")
    else:
        print(f"❌ Charlie -> Alice follow failed: {response.status_code} - {response.text}")
    
    # Alice follows Charlie (creating mutual follow)
    follow_data = {"user_id": charlie_user_id}
    response = requests.post(f"{BASE_URL}/api/follow/follow", json=follow_data, cookies=alice_cookies)
    if response.status_code == 200:
        print("✅ Alice follows Charlie (mutual)")
    else:
        print(f"❌ Alice -> Charlie follow failed: {response.status_code} - {response.text}")
    
    # Step 3: Check follow status
    print("\n🔍 Step 3: Check follow status...")
    
    response = requests.get(f"{BASE_URL}/api/follow/status/{bob_user_id}", cookies=alice_cookies)
    if response.status_code == 200:
        status_data = response.json()
        print("✅ Alice -> Bob status check")
        print(f"   Is Following: {status_data['is_following']}")
        print(f"   Follows You: {status_data['follows_you']}")
        print(f"   Mutual: {status_data['mutual_follow']}")
    else:
        print(f"❌ Status check failed: {response.status_code}")
    
    # Step 4: Get followers list
    print("\n👥 Step 4: Get followers list...")
    
    response = requests.get(f"{BASE_URL}/api/follow/{alice_user_id}/followers", cookies=alice_cookies)
    if response.status_code == 200:
        followers_data = response.json()
        print("✅ Alice's followers list")
        print(f"   Total Followers: {followers_data['total']}")
        print(f"   Followers Count: {len(followers_data['followers'])}")
        if followers_data['followers']:
            first_follower = followers_data['followers'][0]
            print(f"   First Follower: {first_follower['display_name']} (follows_you: {first_follower['follows_you']})")
    else:
        print(f"❌ Followers list failed: {response.status_code} - {response.text}")
    
    # Step 5: Get following list
    print("\n👥 Step 5: Get following list...")
    
    response = requests.get(f"{BASE_URL}/api/follow/me/following", cookies=alice_cookies)
    if response.status_code == 200:
        following_data = response.json()
        print("✅ Alice's following list")
        print(f"   Total Following: {following_data['total']}")
        print(f"   Following Count: {len(following_data['following'])}")
        if following_data['following']:
            first_following = following_data['following'][0]
            print(f"   First Following: {first_following['display_name']} (mutual: {first_following['mutual_follow']})")
    else:
        print(f"❌ Following list failed: {response.status_code} - {response.text}")
    
    # Step 6: Get mutual follows
    print("\n🤝 Step 6: Get mutual follows...")
    
    response = requests.get(f"{BASE_URL}/api/follow/mutual/{charlie_user_id}", cookies=alice_cookies)
    if response.status_code == 200:
        mutual_data = response.json()
        print("✅ Alice & Charlie mutual follows")
        print(f"   Mutual Follows: {mutual_data['total']}")
        if mutual_data['mutual_follows']:
            first_mutual = mutual_data['mutual_follows'][0]
            print(f"   First Mutual: {first_mutual['display_name']}")
    else:
        print(f"❌ Mutual follows failed: {response.status_code} - {response.text}")
    
    # Step 7: Get follow suggestions
    print("\n💡 Step 7: Get follow suggestions...")
    
    response = requests.get(f"{BASE_URL}/api/follow/suggestions", cookies=alice_cookies)
    if response.status_code == 200:
        suggestions_data = response.json()
        print("✅ Follow suggestions for Alice")
        print(f"   Suggestion Reason: {suggestions_data['reason']}")
        print(f"   Suggestions Count: {len(suggestions_data['suggestions'])}")
        if suggestions_data['suggestions']:
            first_suggestion = suggestions_data['suggestions'][0]
            print(f"   First Suggestion: {first_suggestion['display_name']}")
    else:
        print(f"❌ Follow suggestions failed: {response.status_code} - {response.text}")
    
    # Step 8: Get follow statistics
    print("\n📊 Step 8: Get follow statistics...")
    
    response = requests.get(f"{BASE_URL}/api/follow/stats/me", cookies=alice_cookies)
    if response.status_code == 200:
        stats_data = response.json()
        print("✅ Alice's follow stats")
        print(f"   Follower Count: {stats_data['follower_count']}")
        print(f"   Following Count: {stats_data['following_count']}")
        if 'mutual_followers_count' in stats_data:
            print(f"   Mutual Followers: {stats_data['mutual_followers_count']}")
    else:
        print(f"❌ Follow stats failed: {response.status_code} - {response.text}")
    
    # Step 9: Get follow activity
    print("\n📈 Step 9: Get follow activity...")
    
    response = requests.get(f"{BASE_URL}/api/follow/activity/me", cookies=alice_cookies)
    if response.status_code == 200:
        activity_data = response.json()
        print("✅ Alice's follow activity")
        print(f"   Recent Followers: {len(activity_data['recent_followers'])}")
        print(f"   Recent Following: {len(activity_data['recent_following'])}")
        print(f"   Follower Growth (7d): {activity_data['follower_growth']}")
        print(f"   Following Growth (7d): {activity_data['following_growth']}")
    else:
        print(f"❌ Follow activity failed: {response.status_code} - {response.text}")
    
    # Step 10: Test unfollow
    print("\n💔 Step 10: Test unfollow...")
    
    unfollow_data = {"user_id": bob_user_id}
    response = requests.delete(f"{BASE_URL}/api/follow/unfollow", json=unfollow_data, cookies=alice_cookies)
    if response.status_code == 200:
        unfollow_result = response.json()
        print("✅ Alice unfollows Bob")
        print(f"   Message: {unfollow_result['message']}")
    else:
        print(f"❌ Unfollow failed: {response.status_code} - {response.text}")
    
    # Step 11: Verify unfollow
    print("\n🔍 Step 11: Verify unfollow...")
    
    response = requests.get(f"{BASE_URL}/api/follow/status/{bob_user_id}", cookies=alice_cookies)
    if response.status_code == 200:
        status_data = response.json()
        print("✅ Post-unfollow status check")
        print(f"   Is Following Bob: {status_data['is_following']}")
        print(f"   Bob Follows Alice: {status_data['follows_you']}")
    else:
        print(f"❌ Status check after unfollow failed: {response.status_code}")
    
    # Step 12: Test bulk follow
    print("\n🎯 Step 12: Test bulk operations...")
    
    bulk_follow_data = [bob_user_id, charlie_user_id]
    response = requests.post(f"{BASE_URL}/api/follow/bulk/follow", json=bulk_follow_data, cookies=alice_cookies)
    if response.status_code == 200:
        bulk_result = response.json()
        print("✅ Bulk follow test")
        print(f"   Message: {bulk_result['message']}")
    else:
        print(f"❌ Bulk follow failed: {response.status_code} - {response.text}")
    
    print("\n" + "=" * 60)
    print("🎉 Phase J3 Follow Graph Tests Complete!")
    
    return {
        "alice_cookies": alice_cookies,
        "bob_cookies": bob_cookies,
        "charlie_cookies": charlie_cookies
    }


if __name__ == "__main__":
    test_follow_graph()