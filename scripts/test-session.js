/**
 * P-Chart Session Handling Test Script
 * 
 * This script contains tests to verify the robust session handling implementation
 * is working correctly. Run this script in your browser console to test various
 * session handling scenarios.
 */

const testSessionHandling = async () => {
  console.log('🧪 Starting P-Chart Session Handling Tests');
  
  // Test 1: Normal session fetch
  console.log('\n📋 Test 1: Normal session fetch');
  try {
    const sessionResponse = await fetch('/api/auth/session');
    const sessionData = await sessionResponse.json();
    console.log('✅ Session fetch successful:', sessionData);
  } catch (error) {
    console.error('❌ Session fetch failed:', error);
  }
  
  // Test 2: Authorization header fallback
  console.log('\n📋 Test 2: Authorization header fallback');
  try {
    const response = await fetch('/api/production-orders', {
      headers: {
        'Authorization': 'Bearer admin@example.com'
      }
    });
    const data = await response.json();
    console.log('✅ Authorization header fallback successful:', data);
  } catch (error) {
    console.error('❌ Authorization header fallback failed:', error);
  }
  
  // Test 3: Create Production Order
  console.log('\n📋 Test 3: Create Production Order');
  try {
    const testOrder = {
      poNumber: `TEST-${Math.floor(Math.random() * 10000)}`,
      lotNumber: 'TEST-LOT',
      quantity: '100',
      itemName: 'Test Item'
    };
    
    const response = await fetch('/api/production-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin@example.com'
      },
      body: JSON.stringify(testOrder)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Production order creation successful:', data);
  } catch (error) {
    console.error('❌ Production order creation failed:', error);
  }
  
  console.log('\n🏁 Session Handling Tests Complete');
};

// Run the tests
// testSessionHandling();

// Export the test function for browser console use
console.log(`
Session Test Instructions:
1. Log in to the application
2. Open browser console and run:
   testSessionHandling()
3. Check test results
`);

module.exports = { testSessionHandling }; 