#!/usr/bin/env python3
"""
Simple test script to verify the FastAPI backend is working correctly
"""

import requests
import json
import time

def test_endpoint(url, method='GET', data=None, expected_status=200):
    """Test an API endpoint"""
    try:
        if method == 'GET':
            response = requests.get(url, timeout=10)
        elif method == 'POST':
            headers = {'Content-Type': 'application/json'}
            response = requests.post(url, json=data, headers=headers, timeout=10)
        else:
            print(f"❌ Unsupported method: {method}")
            return False

        print(f"🔍 Testing {method} {url}")
        print(f"   Status: {response.status_code}")

        if response.status_code == expected_status:
            try:
                result = response.json()
                print(f"   ✅ Success: {json.dumps(result, indent=2)[:200]}...")
                return True
            except:
                print(f"   ✅ Success: {response.text[:200]}...")
                return True
        else:
            print(f"   ❌ Expected {expected_status}, got {response.status_code}")
            try:
                error = response.json()
                print(f"   Error: {json.dumps(error, indent=2)}")
            except:
                print(f"   Error: {response.text}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {e}")
        return False
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
        return False

def main():
    """Run all backend tests"""
    base_url = "http://127.0.0.1:5000"

    print("🧪 Testing Tradia MT5 Backend")
    print("=" * 50)

    tests_passed = 0
    total_tests = 0

    # Test 1: Health check
    total_tests += 1
    if test_endpoint(f"{base_url}/health"):
        tests_passed += 1

    # Test 2: Requirements check
    total_tests += 1
    if test_endpoint(f"{base_url}/requirements"):
        tests_passed += 1

    # Test 3: Validate connection (with dummy data)
    total_tests += 1
    test_data = {
        "login": 123456,
        "password": "test_password",
        "server": "TestServer-MT5"
    }
    # This will likely fail due to invalid credentials, but should return proper error
    if test_endpoint(f"{base_url}/validate_mt5", 'POST', test_data, expected_status=400):
        tests_passed += 1

    # Test 4: Sync MT5 (with dummy data)
    total_tests += 1
    sync_data = {
        "login": 123456,
        "password": "test_password",
        "server": "TestServer-MT5",
        "from_ts": "2024-01-01T00:00:00",
        "to_ts": "2024-01-02T00:00:00"
    }
    # This will likely fail due to invalid credentials, but should return proper error
    if test_endpoint(f"{base_url}/sync_mt5", 'POST', sync_data, expected_status=400):
        tests_passed += 1

    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tests_passed}/{total_tests} passed")

    if tests_passed == total_tests:
        print("🎉 All tests passed! Backend is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        return False

if __name__ == "__main__":
    print("⏳ Waiting 3 seconds for backend to start...")
    time.sleep(3)

    success = main()

    if not success:
        print("\n🔧 Troubleshooting:")
        print("1. Make sure the backend is running: python3 tradia-backend/app.py")
        print("2. Check if port 5000 is available")
        print("3. Verify all Python dependencies are installed")
        print("4. Check the backend logs for errors")
        exit(1)
    else:
        print("\n🚀 Backend is ready! You can now:")
        print("1. Start the frontend: npm run dev")
        print("2. Open http://localhost:3000")
        print("3. Go to Dashboard → MT5 Integration")
        print("4. Test the MT5 connection")