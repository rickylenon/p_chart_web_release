/**
 * P-Chart Session Handling Test CLI
 * 
 * This script tests the session handling from the command line.
 * Run with: node scripts/test-session-cli.js
 */

const fetch = require('node-fetch');
const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function testSessionHandling() {
  console.log('\n🧪 Starting P-Chart Session Handling CLI Tests');
  console.log(`Base URL: ${baseUrl}`);
  
  // Test 1: Get session endpoint directly
  console.log('\n📋 Test 1: Session endpoint');
  try {
    const response = await fetch(`${baseUrl}/api/auth/session`);
    const data = await response.json();
    console.log('Response:', data);
    console.log(data && Object.keys(data).length > 0 ? '✅ Has session data' : '⚠️ No session data (expected without auth cookie)');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  // Test 2: Test fallback authorization
  console.log('\n📋 Test 2: Fallback authorization');
  try {
    const response = await fetch(`${baseUrl}/api/production-orders`, {
      headers: {
        'Authorization': 'Bearer admin@example.com'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Fallback auth successful');
      console.log(`Found ${data.orders?.length || 0} production orders`);
    } else {
      console.log('❌ Fallback auth failed:', response.status, response.statusText);
      const error = await response.text();
      console.log('Error:', error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  // Test 3: Create production order
  console.log('\n📋 Test 3: Create production order');
  try {
    const testOrder = {
      poNumber: `TEST-${Math.floor(Math.random() * 10000)}`,
      lotNumber: 'TEST-LOT',
      quantity: '100',
      itemName: 'Test Item'
    };
    
    console.log('Creating order:', testOrder);
    
    const response = await fetch(`${baseUrl}/api/production-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin@example.com'
      },
      body: JSON.stringify(testOrder)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Order created successfully:', data);
    } else {
      console.log('❌ Order creation failed:', response.status, response.statusText);
      const error = await response.text();
      console.log('Error:', error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n🏁 Session Handling CLI Tests Complete');
}

// Run the tests
testSessionHandling().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 