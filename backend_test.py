#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class PremiumSphereAPITester:
    def __init__(self, base_url="https://sphere-launch-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.admin_session = requests.Session()
        self.user_session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.admin_session.headers.update({'Content-Type': 'application/json'})
        self.user_session.headers.update({'Content-Type': 'application/json'})
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_authenticated = False
        self.user_authenticated = False
        self.test_product_id = None
        self.test_category_id = None
        self.test_order_id = None

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_type=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Choose the right session based on auth type
        if auth_type == "admin":
            session = self.admin_session
        elif auth_type == "user":
            session = self.user_session
        else:
            session = self.session

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = session.get(url, headers=headers)
            elif method == 'POST':
                response = session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = session.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = session.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    self.log(f"   Error: {error_detail}")
                except:
                    self.log(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_get_categories(self):
        """Test getting categories"""
        success, response = self.run_test("Get Categories", "GET", "categories", 200)
        if success and len(response) >= 6:
            self.log(f"   Found {len(response)} categories")
            return True
        elif success:
            self.log(f"   Warning: Expected 6+ categories, found {len(response)}")
        return success

    def test_get_products(self):
        """Test getting products"""
        success, response = self.run_test("Get Products", "GET", "products", 200)
        if success and response.get('products') and len(response['products']) >= 20:
            self.log(f"   Found {len(response['products'])} products")
            # Store first product ID for later tests
            if response['products']:
                self.test_product_id = response['products'][0]['id']
            return True
        elif success:
            products_count = len(response.get('products', []))
            self.log(f"   Warning: Expected 20+ products, found {products_count}")
        return success

    def test_product_search(self):
        """Test product search functionality"""
        success, response = self.run_test("Product Search", "GET", "products?search=netflix", 200)
        if success:
            products = response.get('products', [])
            netflix_found = any('netflix' in p.get('name', '').lower() for p in products)
            if netflix_found:
                self.log(f"   Found Netflix products in search results")
            else:
                self.log(f"   Warning: No Netflix products found in search")
        return success

    def test_category_filter(self):
        """Test category filtering"""
        success, response = self.run_test("Category Filter", "GET", "products?category=Gaming", 200)
        if success:
            products = response.get('products', [])
            gaming_products = [p for p in products if 'gaming' in p.get('category', '').lower()]
            self.log(f"   Found {len(gaming_products)} gaming products")
        return success

    def test_get_single_product(self):
        """Test getting a single product"""
        if not self.test_product_id:
            self.log("❌ No product ID available for single product test")
            return False
        
        return self.run_test("Get Single Product", "GET", f"products/{self.test_product_id}", 200)

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login", 
            "POST", 
            "auth/login", 
            200,
            {"email": "admin@premiumsphere.com", "password": "Admin@123"},
            auth_type="admin"
        )
        if success and response.get('role') == 'admin':
            self.admin_authenticated = True
            self.log("   Admin login successful")
            return True
        return success

    def test_user_registration(self):
        """Test user registration"""
        test_email = f"testuser_{datetime.now().strftime('%H%M%S')}@example.com"
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            {"name": "Test User", "email": test_email, "password": "TestPass123!"},
            auth_type="user"
        )
        if success and response.get('role') == 'customer':
            self.user_authenticated = True
            self.log("   User registration successful")
            return True
        return success

    def test_auth_me_unauthenticated(self):
        """Test /auth/me without authentication"""
        # Use a fresh session without any cookies
        fresh_session = requests.Session()
        fresh_session.headers.update({'Content-Type': 'application/json'})
        url = f"{self.base_url}/api/auth/me"
        
        self.tests_run += 1
        self.log("Testing Auth Me (Unauthenticated)...")
        
        try:
            response = fresh_session.get(url)
            success = response.status_code == 401
            if success:
                self.tests_passed += 1
                self.log(f"✅ Auth Me (Unauthenticated) - Status: {response.status_code}")
                return True
            else:
                self.log(f"❌ Auth Me (Unauthenticated) - Expected 401, got {response.status_code}")
                return False
        except Exception as e:
            self.log(f"❌ Auth Me (Unauthenticated) - Error: {str(e)}")
            return False

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        return self.run_test("Admin Stats", "GET", "admin/stats", 200, auth_type="admin")

    def test_create_product_admin(self):
        """Test creating a product as admin"""
        product_data = {
            "name": "Test Product",
            "description": "A test product for API testing",
            "price": 9.99,
            "original_price": 19.99,
            "image_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80",
            "category": "Testing",
            "platform": "Test Platform",
            "badge": "TEST",
            "in_stock": True,
            "featured": False,
            "best_seller": False
        }
        success, response = self.run_test(
            "Create Product (Admin)",
            "POST",
            "products",
            200,
            product_data,
            auth_type="admin"
        )
        if success and response.get('id'):
            self.test_product_id = response['id']
            self.log(f"   Created test product with ID: {self.test_product_id}")
        return success

    def test_delete_product_admin(self):
        """Test deleting a product as admin"""
        if not self.test_product_id:
            self.log("❌ No test product ID available for deletion test")
            return False
        
        return self.run_test(
            "Delete Product (Admin)",
            "DELETE",
            f"products/{self.test_product_id}",
            200,
            auth_type="admin"
        )

    def test_create_category_admin(self):
        """Test creating a category as admin"""
        category_data = {
            "name": "Test Category",
            "icon": "TestIcon",
            "description": "A test category for API testing"
        }
        success, response = self.run_test(
            "Create Category (Admin)",
            "POST",
            "categories",
            200,
            category_data,
            auth_type="admin"
        )
        if success and response.get('id'):
            self.test_category_id = response['id']
            self.log(f"   Created test category with ID: {self.test_category_id}")
        return success

    def test_delete_category_admin(self):
        """Test deleting a category as admin"""
        if not self.test_category_id:
            self.log("❌ No test category ID available for deletion test")
            return False
        
        return self.run_test(
            "Delete Category (Admin)",
            "DELETE",
            f"categories/{self.test_category_id}",
            200,
            auth_type="admin"
        )

    def test_cloudinary_signature_admin(self):
        """Test Cloudinary signature endpoint with admin auth"""
        success, response = self.run_test(
            "Cloudinary Signature (Admin)",
            "GET",
            "cloudinary/signature",
            200,
            auth_type="admin"
        )
        if success:
            required_fields = ['signature', 'timestamp', 'cloud_name', 'api_key', 'folder']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                self.log(f"   Warning: Missing fields in response: {missing_fields}")
                return False
            else:
                self.log(f"   All required fields present: {required_fields}")
                # Verify folder is correct
                if response.get('folder') == 'premium_sphere/products':
                    self.log(f"   Folder correctly set to: {response['folder']}")
                else:
                    self.log(f"   Warning: Unexpected folder: {response.get('folder')}")
        return success

    def test_cloudinary_signature_unauthenticated(self):
        """Test Cloudinary signature endpoint without authentication"""
        # Use fresh session without cookies
        fresh_session = requests.Session()
        fresh_session.headers.update({'Content-Type': 'application/json'})
        
        self.tests_run += 1
        self.log("Testing Cloudinary Signature (Unauthenticated)...")
        
        try:
            response = fresh_session.get(f"{self.base_url}/api/cloudinary/signature")
            success = response.status_code == 401
            if success:
                self.tests_passed += 1
                self.log(f"✅ Cloudinary Signature (Unauthenticated) - Status: {response.status_code}")
                return True
            else:
                self.log(f"❌ Cloudinary Signature (Unauthenticated) - Expected 401, got {response.status_code}")
                return False
        except Exception as e:
            self.log(f"❌ Cloudinary Signature (Unauthenticated) - Error: {str(e)}")
            return False

    def test_cart_operations_unauthenticated(self):
        """Test cart operations without authentication"""
        # Use fresh session without cookies
        fresh_session = requests.Session()
        fresh_session.headers.update({'Content-Type': 'application/json'})
        
        self.tests_run += 2
        self.log("Testing Get Cart (Unauthenticated)...")
        self.log("Testing Add to Cart (Unauthenticated)...")
        
        try:
            # Test GET cart
            response1 = fresh_session.get(f"{self.base_url}/api/cart")
            success1 = response1.status_code == 401
            
            # Test POST cart/add
            response2 = fresh_session.post(f"{self.base_url}/api/cart/add", json={"product_id": "test", "quantity": 1})
            success2 = response2.status_code == 401
            
            if success1:
                self.tests_passed += 1
                self.log(f"✅ Get Cart (Unauthenticated) - Status: {response1.status_code}")
            else:
                self.log(f"❌ Get Cart (Unauthenticated) - Expected 401, got {response1.status_code}")
                
            if success2:
                self.tests_passed += 1
                self.log(f"✅ Add to Cart (Unauthenticated) - Status: {response2.status_code}")
            else:
                self.log(f"❌ Add to Cart (Unauthenticated) - Expected 401, got {response2.status_code}")
                
            return success1 and success2
        except Exception as e:
            self.log(f"❌ Cart operations - Error: {str(e)}")
            return False

    def test_orders_unauthenticated(self):
        """Test orders endpoint without authentication"""
        # Use fresh session without cookies
        fresh_session = requests.Session()
        fresh_session.headers.update({'Content-Type': 'application/json'})
        
        self.tests_run += 2
        self.log("Testing Get Orders (Unauthenticated)...")
        self.log("Testing Create Order (Unauthenticated)...")
        
        try:
            # Test GET orders
            response1 = fresh_session.get(f"{self.base_url}/api/orders")
            success1 = response1.status_code == 401
            
            # Test POST orders
            response2 = fresh_session.post(f"{self.base_url}/api/orders")
            success2 = response2.status_code == 401
            
            if success1:
                self.tests_passed += 1
                self.log(f"✅ Get Orders (Unauthenticated) - Status: {response1.status_code}")
            else:
                self.log(f"❌ Get Orders (Unauthenticated) - Expected 401, got {response1.status_code}")
                
            if success2:
                self.tests_passed += 1
                self.log(f"✅ Create Order (Unauthenticated) - Status: {response2.status_code}")
            else:
                self.log(f"❌ Create Order (Unauthenticated) - Expected 401, got {response2.status_code}")
                
            return success1 and success2
        except Exception as e:
            self.log(f"❌ Orders operations - Error: {str(e)}")
            return False

    def test_create_order_user(self):
        """Test creating an order as authenticated user"""
        if not self.user_authenticated:
            self.log("❌ User not authenticated, skipping order creation test")
            return False
        
        # First add a product to cart
        if not self.test_product_id:
            self.log("❌ No test product ID available for order creation")
            return False
            
        # Add to cart first
        cart_success, _ = self.run_test(
            "Add to Cart (User)",
            "POST",
            "cart/add",
            200,
            {"product_id": self.test_product_id, "quantity": 1},
            auth_type="user"
        )
        
        if not cart_success:
            self.log("❌ Failed to add product to cart")
            return False
        
        # Create order
        success, response = self.run_test(
            "Create Order (User)",
            "POST",
            "orders",
            200,
            auth_type="user"
        )
        
        if success and response.get('id'):
            self.test_order_id = response['id']
            self.log(f"   Created test order with ID: {self.test_order_id}")
            return True
        return success

    def test_update_order_status_admin(self):
        """Test updating order status as admin"""
        if not self.admin_authenticated:
            self.log("❌ Admin not authenticated, skipping order status update test")
            return False
            
        if not self.test_order_id:
            self.log("❌ No test order ID available for status update test")
            return False
        
        # Test updating to processing
        success, response = self.run_test(
            "Update Order Status (Admin)",
            "PUT",
            f"orders/{self.test_order_id}/status",
            200,
            {"status": "processing"},
            auth_type="admin"
        )
        
        if success and response.get('status') == 'processing':
            self.log(f"   Order status updated to: {response['status']}")
            return True
        return success

    def test_update_order_status_invalid(self):
        """Test updating order status with invalid status"""
        if not self.admin_authenticated:
            self.log("❌ Admin not authenticated, skipping invalid status test")
            return False
            
        if not self.test_order_id:
            self.log("❌ No test order ID available for invalid status test")
            return False
        
        # Test with invalid status
        success, response = self.run_test(
            "Update Order Status (Invalid)",
            "PUT",
            f"orders/{self.test_order_id}/status",
            400,
            {"status": "invalid_status"},
            auth_type="admin"
        )
        return success

    def test_update_order_status_non_admin(self):
        """Test updating order status as non-admin user"""
        if not self.user_authenticated:
            self.log("❌ User not authenticated, skipping non-admin status update test")
            return False
            
        if not self.test_order_id:
            self.log("❌ No test order ID available for non-admin status test")
            return False
        
        # Test updating status as regular user (should fail)
        success, response = self.run_test(
            "Update Order Status (Non-Admin)",
            "PUT",
            f"orders/{self.test_order_id}/status",
            403,
            {"status": "delivered"},
            auth_type="user"
        )
        return success

    def test_update_order_status_nonexistent(self):
        """Test updating status of non-existent order"""
        if not self.admin_authenticated:
            self.log("❌ Admin not authenticated, skipping non-existent order test")
            return False
        
        # Test with non-existent order ID
        success, response = self.run_test(
            "Update Order Status (Non-existent)",
            "PUT",
            "orders/non-existent-id/status",
            404,
            {"status": "delivered"},
            auth_type="admin"
        )
        return success

    def run_all_tests(self):
        """Run all API tests"""
        self.log("🚀 Starting Premium Sphere API Tests")
        self.log("=" * 50)

        # Basic API tests (no auth needed)
        self.test_root_endpoint()
        self.test_get_categories()
        self.test_get_products()
        self.test_product_search()
        self.test_category_filter()
        self.test_get_single_product()

        # Test unauthenticated access first
        self.test_auth_me_unauthenticated()
        self.test_cart_operations_unauthenticated()
        self.test_orders_unauthenticated()

        # Auth tests
        self.test_admin_login()
        self.test_user_registration()

        # Order creation test (needs authenticated user)
        if self.user_authenticated:
            self.test_create_order_user()

        # Admin functionality tests (only if admin auth worked)
        if self.admin_authenticated:
            self.test_admin_stats()
            self.test_cloudinary_signature_admin()
            self.test_create_product_admin()
            self.test_create_category_admin()
            
            # Order status management tests (new functionality)
            if self.test_order_id:
                self.test_update_order_status_admin()
                self.test_update_order_status_invalid()
                self.test_update_order_status_nonexistent()
                if self.user_authenticated:
                    self.test_update_order_status_non_admin()
            
            # Cleanup tests
            self.test_delete_product_admin()
            self.test_delete_category_admin()
        else:
            self.log("⚠️  Skipping admin tests - admin authentication failed")

        # Test Cloudinary endpoint without auth
        self.test_cloudinary_signature_unauthenticated()

        # Print results
        self.log("=" * 50)
        self.log(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 All tests passed!")
            return 0
        else:
            self.log(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = PremiumSphereAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())