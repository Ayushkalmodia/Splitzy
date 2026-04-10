// Test the specific 1000 equal split case
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

const test1000Split = async () => {
  // Login first
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
  
  // Create group with members
  const groupResult = await apiCall('/groups', 'POST', {
    name: '1000 Split Test Group',
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
  
  // Test the problematic 1000 equal split
  const expenseData = {
    description: '1000 Equal Split Test',
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
  
  console.log('Sending expense data:', JSON.stringify(expenseData, null, 2));
  
  const expenseResult = await apiCall('/expenses', 'POST', expenseData, token);
  console.log('Expense result:', JSON.stringify(expenseResult, null, 2));
  
  if (expenseResult.success) {
    // Verify the split amounts
    const splits = expenseResult.data.splits;
    const total = splits.reduce((sum, split) => sum + split.amount, 0);
    console.log(`Split amounts: [${splits.map(s => s.amount).join(', ')}]`);
    console.log(`Total: ${total}, Expected: 1000, Match: ${total === 1000}`);
  }
};

test1000Split();
