// Debug test for expense creation
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

const testExpense = async () => {
  // First login to get token
  const loginResult = await apiCall('/auth/login', 'POST', {
    email: 'test1@example.com',
    password: 'password123'
  });
  
  if (!loginResult.success) {
    console.log('Login failed:', loginResult);
    return;
  }
  
  const token = loginResult.data.token;
  console.log('Full login response:', JSON.stringify(loginResult.data, null, 2));
  
  const userId = loginResult.data.user.id;
  
  console.log('Token:', token);
  console.log('UserId:', userId);
  
  // Create group first
  const groupResult = await apiCall('/groups', 'POST', {
    name: 'Debug Group',
    description: 'Group for debugging',
    members: [
      { userId: userId, email: 'test1@example.com' },
      { email: 'test2@example.com' }
    ]
  }, token);
  
  if (!groupResult.success) {
    console.log('Group creation failed:', groupResult);
    return;
  }
  
  const groupId = groupResult.data._id;
  console.log('GroupId:', groupId);
  
  // Test simple expense
  const expenseData = {
    description: 'Test Expense',
    amount: 100,
    category: 'food',
    groupId: groupId,
    paidBy: userId,
    splitType: 'equal',
    splits: [
      { userId: userId, amount: 50 },
      { email: 'test2@example.com', amount: 50 }
    ]
  };
  
  console.log('Expense data being sent:', JSON.stringify(expenseData, null, 2));
  
  const expenseResult = await apiCall('/expenses', 'POST', expenseData, token);
  console.log('Expense result:', JSON.stringify(expenseResult, null, 2));
};

testExpense();
