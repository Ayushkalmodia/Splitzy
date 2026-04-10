// Minimal test to isolate equal split issue
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

const testMinimalExpense = async () => {
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
    name: 'Minimal Test Group',
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
  
  // Test simple equal split with exact amounts
  const expenseData = {
    description: 'Minimal Equal Split Test',
    amount: 99.99, // Use amount that divides evenly
    category: 'food',
    groupId: groupId,
    paidBy: userId,
    splitType: 'equal',
    splits: [
      { userId: userId, amount: 33.33 },
      { email: 'test2@example.com', amount: 33.33 },
      { email: 'test3@example.com', amount: 33.33 }
    ]
  };
  
  console.log('Sending expense data:', JSON.stringify(expenseData, null, 2));
  
  const expenseResult = await apiCall('/expenses', 'POST', expenseData, token);
  console.log('Expense result:', JSON.stringify(expenseResult, null, 2));
};

testMinimalExpense();
