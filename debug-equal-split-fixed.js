// Debug equal split calculation with fixed amounts
const { divideCurrency, multiplyCurrency, currencyEquals } = require('./splitzy-backend/src/utils/currency.js');

const amount = 1000;
const splits = [
  { userId: 'user1', amount: 333.34 },
  { userId: 'user2', amount: 333.33 },
  { userId: 'user3', amount: 333.33 }
];

console.log('Amount:', amount);
console.log('Splits:', splits);

const equalAmount = divideCurrency(amount, splits.length);
console.log('Equal amount calculated:', equalAmount);

splits.forEach(split => {
  split.amount = equalAmount;
  split.percentage = divideCurrency(100, splits.length);
  split.shares = 1;
});

const totalAmount = multiplyCurrency(equalAmount, splits.length);
console.log('Total amount calculated:', totalAmount);
console.log('Are amounts equal?', currencyEquals(totalAmount, amount));

// Test individual calculations
console.log('333.34 + 333.33 + 333.33 =', 333.34 + 333.33 + 333.33);
console.log('Expected total:', 1000);
