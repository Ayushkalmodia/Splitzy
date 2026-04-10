// Comprehensive test of all split types with balance verification
const API_BASE = 'http://localhost:5050/api';

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

const testAllSplitTypes = async () => {
  console.log('=== COMPREHENSIVE SPLIT TYPE TEST ===');
  
  // Login
  const loginResult = await apiCall('/auth/login', 'POST', {
    email: 'test1@example.com',
    password: 'password123'
  });
  
  if (!loginResult.success) {
    console.log('Login failed:', loginResult);
    return;
  }
  
  const token = loginResult.data.token;
  const userId = loginResult.data.user.id;
  
  // Create group
  const groupResult = await apiCall('/groups', 'POST', {
    name: 'Comprehensive Test Group',
    members: [
      { userId: userId, email: 'test1@example.com' },
      { email: 'test2@example.com' },
      { email: 'test3@example.com' }
    ]
  }, token);
  
  if (!groupResult.success) {
    console.log('Group creation failed:', groupResult);
    return;
  }
  
  const groupId = groupResult.data._id;
  console.log(`Created group: ${groupId}`);
  
  // Test 1: Equal Split (1000)
  const equalExpense = {
    description: 'Equal Split - 1000',
    amount: 1000,
    category: 'food',
    groupId: groupId,
    paidBy: userId,
    splitType: 'equal',
    splits: [
      { userId: userId, amount: 333.33 },
      { email: 'test2@example.com', amount: 333.33 },
      { email: 'test3@example.com', amount: 333.34 }
    ]
  };
  
  const equalResult = await apiCall('/expenses', 'POST', equalExpense, token);
  if (equalResult.success) {
    const splits = equalResult.data.splits;
    const total = splits.reduce((sum, split) => sum + split.amount, 0);
    console.log(`\n1. EQUAL SPLIT (1000):`);
    console.log(`   Amounts: [${splits.map(s => s.amount).join(', ')}]`);
    console.log(`   Total: ${total}, Expected: 1000, Match: ${total === 1000} ${total === 1000 ? 'PASS' : 'FAIL'}`);
  } else {
    console.log(`\n1. EQUAL SPLIT (1000): FAIL - ${equalResult.data.message}`);
  }
  
  // Test 2: Percentage Split (2000)
  const percentageExpense = {
    description: 'Percentage Split - 2000',
    amount: 2000,
    category: 'transport',
    groupId: groupId,
    paidBy: userId,
    splitType: 'percentage',
    splits: [
      { userId: userId, amount: 800, percentage: 40 },
      { email: 'test2@example.com', amount: 600, percentage: 30 },
      { email: 'test3@example.com', amount: 600, percentage: 30 }
    ]
  };
  
  const percentageResult = await apiCall('/expenses', 'POST', percentageExpense, token);
  if (percentageResult.success) {
    const splits = percentageResult.data.splits;
    const total = splits.reduce((sum, split) => sum + split.amount, 0);
    console.log(`\n2. PERCENTAGE SPLIT (2000):`);
    console.log(`   Amounts: [${splits.map(s => s.amount).join(', ')}]`);
    console.log(`   Percentages: [${splits.map(s => s.percentage).join(', ')}%]`);
    console.log(`   Total: ${total}, Expected: 2000, Match: ${total === 2000} ${total === 2000 ? 'PASS' : 'FAIL'}`);
  } else {
    console.log(`\n2. PERCENTAGE SPLIT (2000): FAIL - ${percentageResult.data.message}`);
  }
  
  // Test 3: Custom/Unequal Split (1500.75)
  const customExpense = {
    description: 'Custom Split - 1500.75',
    amount: 1500.75,
    category: 'shopping',
    groupId: groupId,
    paidBy: userId,
    splitType: 'unequal',
    splits: [
      { userId: userId, amount: 500.25 },
      { email: 'test2@example.com', amount: 600.50 },
      { email: 'test3@example.com', amount: 400.00 }
    ]
  };
  
  const customResult = await apiCall('/expenses', 'POST', customExpense, token);
  if (customResult.success) {
    const splits = customResult.data.splits;
    const total = splits.reduce((sum, split) => sum + split.amount, 0);
    console.log(`\n3. CUSTOM SPLIT (1500.75):`);
    console.log(`   Amounts: [${splits.map(s => s.amount).join(', ')}]`);
    console.log(`   Total: ${total}, Expected: 1500.75, Match: ${total === 1500.75} ${total === 1500.75 ? 'PASS' : 'FAIL'}`);
  } else {
    console.log(`\n3. CUSTOM SPLIT (1500.75): FAIL - ${customResult.data.message}`);
  }
  
  // Test 4: Verify Balance Calculation
  const balanceResult = await apiCall(`/groups/${groupId}/balances`, 'GET', null, token);
  if (balanceResult.success) {
    const balanceData = balanceResult.data;
    console.log(`\n4. BALANCE CALCULATION:`);
    console.log(`   Total Expenses: ${balanceData.totalExpenses}`);
    console.log(`   Debts: ${balanceData.debts.length} settlement(s) needed`);
    if (balanceData.debts.length > 0) {
      balanceData.debts.forEach(debt => {
        console.log(`   - ${debt.from.email} owes ${debt.to.email}: ${debt.amount}`);
      });
    }
  }
  
  console.log(`\n=== TEST COMPLETE ===`);
};

testAllSplitTypes();
