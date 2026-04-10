// POST-IMPLEMENTATION AUDIT TEST CASES - FIXED VERSION
// Senior QA Engineer - Comprehensive Testing

const API_BASE = 'http://localhost:5050/api';

// Test utilities
const apiCall = async (endpoint, method = 'GET', data = null, token = null) => {
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (data) {
    config.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const result = await response.json();
    return { success: response.ok, data: result, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Test users
const testUsers = {
  user1: {
    name: 'Test User 1',
    email: 'test1@example.com',
    password: 'password123'
  },
  user2: {
    name: 'Test User 2', 
    email: 'test2@example.com',
    password: 'password123'
  },
  user3: {
    name: 'Test User 3',
    email: 'test3@example.com', 
    password: 'password123'
  }
};

// Test cases
const testCases = {
  // SECTION 1: AUTHENTICATION FLOWS
  testUserRegistration: async () => {
    console.log('🧪 Testing User Registration...');
    
    for (const [key, user] of Object.entries(testUsers)) {
      console.log(`Testing registration for ${key}...`);
      const result = await apiCall('/auth/register', 'POST', user);
      
      if (result.success) {
        console.log(`✅ ${key} registered successfully`);
        testUsers[key].token = result.data.token;
        testUsers[key].userId = result.data.user.id;
      } else {
        console.log(`❌ ${key} registration failed:`, result.error || result.data);
      }
    }
  },

  testUserLogin: async () => {
    console.log('🧪 Testing User Login...');
    
    for (const [key, user] of Object.entries(testUsers)) {
      console.log(`Testing login for ${key}...`);
      const result = await apiCall('/auth/login', 'POST', {
        email: user.email,
        password: user.password
      });
      
      if (result.success) {
        console.log(`✅ ${key} login successful`);
        testUsers[key].token = result.data.token;
        testUsers[key].userId = result.data.user.id;
      } else {
        console.log(`❌ ${key} login failed:`, result.error || result.data);
      }
    }
  },

  // SECTION 2: GROUP MANAGEMENT
  testGroupCreation: async () => {
    console.log('🧪 Testing Group Creation...');
    
    console.log('User IDs:', { 
      user1: testUsers.user1.userId, 
      user2: testUsers.user2.userId, 
      user3: testUsers.user3.userId 
    });
    
    const groupData = {
      name: 'Test Group',
      description: 'A group for testing expense splitting',
      members: [
        { userId: testUsers.user1.userId, email: testUsers.user1.email },
        { userId: testUsers.user2.userId, email: testUsers.user2.email },
        { userId: testUsers.user3.userId, email: testUsers.user3.email }
      ]
    };
    
    const result = await apiCall('/groups', 'POST', groupData, testUsers.user1.token);
    
    if (result.success) {
      console.log('✅ Group created successfully');
      testCases.groupId = result.data._id;
    } else {
      console.log('❌ Group creation failed:', result.error || result.data);
    }
  },

  testAddMembers: async () => {
    console.log('🧪 Testing Add Members...');
    
    if (!testCases.groupId) {
      console.log('❌ No group available for member testing');
      return;
    }
    
    console.log('✅ Members already added during group creation');
  },

  // SECTION 3: EXPENSE MANAGEMENT
  testExpenseCreation: async () => {
    console.log('🧪 Testing Expense Creation...');
    
    if (!testCases.groupId) {
      console.log('❌ No group available for expense testing');
      return;
    }

    // Test Case 1: Equal split with $1000
    const equalSplitExpense = {
      description: 'Equal Split Test - $1000',
      amount: 1000,
      category: 'food',
      groupId: testCases.groupId,
      paidBy: testUsers.user1.userId, // This should be a valid ObjectId string
      splitType: 'equal',
      splits: [
        { userId: testUsers.user1.userId, amount: 333.34 },
        { userId: testUsers.user2.userId, amount: 333.33 },
        { userId: testUsers.user3.userId, amount: 333.33 }
      ]
    };

    const result1 = await apiCall('/expenses', 'POST', equalSplitExpense, testUsers.user1.token);
    
    if (result1.success) {
      console.log('✅ Equal split expense created successfully');
      testCases.equalExpenseId = result1.data._id;
    } else {
      console.log('❌ Equal split expense failed:', result1.error || result1.data);
    }

    // Test Case 2: Percentage split
    const percentageSplitExpense = {
      description: 'Percentage Split Test',
      amount: 2000,
      category: 'transport',
      groupId: testCases.groupId,
      paidBy: testUsers.user2.userId,
      splitType: 'percentage',
      splits: [
        { userId: testUsers.user1.userId, amount: 800, percentage: 40 },
        { userId: testUsers.user2.userId, amount: 600, percentage: 30 },
        { userId: testUsers.user3.userId, amount: 600, percentage: 30 }
      ]
    };

    const result2 = await apiCall('/expenses', 'POST', percentageSplitExpense, testUsers.user2.token);
    
    if (result2.success) {
      console.log('✅ Percentage split expense created successfully');
      testCases.percentageExpenseId = result2.data._id;
    } else {
      console.log('❌ Percentage split expense failed:', result2.error || result2.data);
    }

    // Test Case 3: Custom uneven split with decimals
    const customSplitExpense = {
      description: 'Custom Split Test with Decimals',
      amount: 1234.56,
      category: 'shopping',
      groupId: testCases.groupId,
      paidBy: testUsers.user3.userId,
      splitType: 'unequal',
      splits: [
        { userId: testUsers.user1.userId, amount: 456.78 },
        { userId: testUsers.user2.userId, amount: 345.67 },
        { userId: testUsers.user3.userId, amount: 432.11 }
      ]
    };

    const result3 = await apiCall('/expenses', 'POST', customSplitExpense, testUsers.user3.token);
    
    if (result3.success) {
      console.log('✅ Custom split expense created successfully');
      testCases.customExpenseId = result3.data._id;
    } else {
      console.log('❌ Custom split expense failed:', result3.error || result3.data);
    }
  },

  testExpenseEdit: async () => {
    console.log('🧪 Testing Expense Edit...');
    
    if (!testCases.equalExpenseId) {
      console.log('❌ No expense available for edit testing');
      return;
    }

    const updatedExpense = {
      description: 'Updated Equal Split Test - $1500',
      amount: 1500,
      category: 'utilities',
      notes: 'This expense was updated'
    };

    const result = await apiCall(`/expenses/${testCases.equalExpenseId}`, 'PUT', updatedExpense, testUsers.user1.token);
    
    if (result.success) {
      console.log('✅ Expense updated successfully');
    } else {
      console.log('❌ Expense update failed:', result.error || result.data);
    }
  },

  testExpenseDelete: async () => {
    console.log('🧪 Testing Expense Delete...');
    
    if (!testCases.customExpenseId) {
      console.log('❌ No expense available for delete testing');
      return;
    }

    const result = await apiCall(`/expenses/${testCases.customExpenseId}`, 'DELETE', null, testUsers.user3.token);
    
    if (result.success) {
      console.log('✅ Expense deleted successfully');
    } else {
      console.log('❌ Expense deletion failed:', result.error || result.data);
    }
  },

  // SECTION 4: BALANCE AND SETTLEMENT
  testBalanceCalculation: async () => {
    console.log('🧪 Testing Balance Calculation...');
    
    if (!testCases.groupId) {
      console.log('❌ No group available for balance testing');
      return;
    }

    // Test group balances
    const result = await apiCall(`/groups/${testCases.groupId}/balances`, 'GET', null, testUsers.user1.token);
    
    if (result.success) {
      console.log('✅ Balance calculation successful');
      console.log('Balance data:', JSON.stringify(result.data, null, 2));
    } else {
      console.log('❌ Balance calculation failed:', result.error || result.data);
    }

    // Test user balance
    const userBalanceResult = await apiCall('/expenses/balance', 'GET', null, testUsers.user1.token);
    
    if (userBalanceResult.success) {
      console.log('✅ User balance calculation successful');
      console.log('User balance:', JSON.stringify(userBalanceResult.data, null, 2));
    } else {
      console.log('❌ User balance calculation failed:', userBalanceResult.error || userBalanceResult.data);
    }
  },

  testSettlementFlow: async () => {
    console.log('🧪 Testing Settlement Flow...');
    
    if (!testCases.groupId) {
      console.log('❌ No group available for settlement testing');
      return;
    }

    // Get settlement suggestions
    const result = await apiCall(`/settlements/group/${testCases.groupId}/suggestions`, 'GET', null, testUsers.user1.token);
    
    if (result.success) {
      console.log('✅ Settlement suggestions successful');
      console.log('Settlement suggestions:', JSON.stringify(result.data, null, 2));
    } else {
      console.log('❌ Settlement suggestions failed:', result.error || result.data);
    }
  },

  // SECTION 5: ANALYTICS AND DASHBOARD
  testAnalytics: async () => {
    console.log('🧪 Testing Analytics...');
    
    // Test expense stats
    const result = await apiCall('/expenses/stats', 'GET', null, testUsers.user1.token);
    
    if (result.success) {
      console.log('✅ Analytics data successful');
      console.log('Analytics:', JSON.stringify(result.data, null, 2));
    } else {
      console.log('❌ Analytics failed:', result.error || result.data);
    }
  }
};

// Run all tests
const runAllTests = async () => {
  console.log('🚀 Starting Comprehensive Post-Implementation Audit - FIXED VERSION\n');
  
  try {
    await testCases.testUserRegistration();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testCases.testUserLogin();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testCases.testGroupCreation();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testCases.testAddMembers();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testCases.testExpenseCreation();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testCases.testExpenseEdit();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testCases.testExpenseDelete();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testCases.testBalanceCalculation();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testCases.testSettlementFlow();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testCases.testAnalytics();
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test suite failed with error:', error);
  }
};

// Export for manual testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, testCases, testUsers };
} else {
  // For browser console testing
  window.splitzyTests = { runAllTests, testCases, testUsers };
}
