# Splitzy - Production-Ready Expense Splitting System

A comprehensive expense splitting application similar to Splitwise, built with the MERN stack.

## 🚀 Features Implemented

### 1. Advanced Group Management
- **Group Creation**: Create groups with names and descriptions
- **Member Roles**: Admin and member roles with proper permissions
- **Invite System**: Generate shareable invite links with expiry
- **Temporary Users**: Add members without accounts who can claim later
- **Member Management**: Add/remove members, update roles

### 2. Advanced Expense Management
- **Multiple Split Types**:
  - Equal split (divide equally among all)
  - Unequal fixed amounts (custom amounts per person)
  - Percentage split (percentage-based allocation)
  - Shares/weight-based split (proportional allocation)
  - Manual split (complete control)
- **Real-time Validation**: Ensures splits always total the expense amount
- **Rich Metadata**: Categories, tags, notes, receipt images
- **Currency Support**: Multi-currency expenses

### 3. Smart Balance Calculation
- **Real-time Balances**: Calculate who owes whom instantly
- **Debt Simplification**: Minimize number of transactions
- **Group & Individual Balances**: View balances per group and overall
- **Visual Balance Summary**: Clear UI showing debts and credits

### 4. Settlement System
- **Settlement Creation**: Mark debts as settled
- **Settlement History**: Track all settlement activities
- **Multiple Methods**: Cash, manual, bank transfer, digital payments
- **Settlement Suggestions**: AI-powered suggestions for optimal settlements
- **Partial Settlements**: Support for partial debt payments

### 5. Architecture Improvements
- **Services Layer**: Clean separation of business logic
- **Input Validation**: Comprehensive validation using Joi
- **Error Handling**: Centralized error handling middleware
- **Pagination**: Efficient data loading for large datasets

### 6. Database Safety
- **Migration Scripts**: Safe schema updates
- **Backward Compatibility**: Old data continues to work
- **Data Integrity**: Proper relationships and constraints

## 📁 Project Structure

```
splitzy/
├── splitzy-backend/
│   ├── src/
│   │   ├── controllers/     # API endpoints
│   │   ├── models/         # Database schemas
│   │   ├── services/       # Business logic layer
│   │   ├── routes/         # Route definitions
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/          # Utility functions
│   │   └── scripts/       # Migration scripts
│   └── package.json
└── splitzy-client/
    ├── src/
    │   ├── components/     # React components
    │   ├── pages/          # Page components
    │   ├── services/       # API service layer
    │   └── lib/           # Utilities
    └── package.json
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 16+
- MongoDB 4.4+
- npm or yarn

### Backend Setup

1. **Install Dependencies**:
```bash
cd splitzy-backend
npm install
```

2. **Environment Variables**:
Create `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/splitzy
JWT_SECRET=your-super-secret-jwt-key
CLIENT_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

3. **Run Migration** (for existing data):
```bash
node src/scripts/migrate.js
```

4. **Start Development Server**:
```bash
npm run dev
```

Backend will run on `http://localhost:5050`

### Frontend Setup

1. **Install Dependencies**:
```bash
cd splitzy-client
npm install
```

2. **Environment Variables**:
Create `.env` file:
```env
VITE_API_URL=http://localhost:5050/api
```

3. **Start Development Server**:
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## 📊 API Endpoints

### Groups
- `GET /api/groups` - Get user's groups
- `POST /api/groups` - Create new group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `GET /api/groups/:id/balances` - Get group balances
- `POST /api/groups/:id/invite` - Generate invite link
- `GET /api/groups/invite/:token` - Validate invite
- `POST /api/groups/join/:token` - Join via invite
- `DELETE /api/groups/:id/members/:memberId` - Remove member
- `PUT /api/groups/:id/members/:memberId/role` - Update member role

### Expenses
- `GET /api/expenses` - Get expenses (with pagination)
- `GET /api/expenses/group/:groupId` - Get group expenses
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
- `GET /api/expenses/stats` - Get expense statistics
- `GET /api/expenses/balance` - Get user balance

### Settlements
- `GET /api/settlements` - Get settlements
- `GET /api/settlements/group/:groupId` - Get group settlements
- `POST /api/settlements` - Create settlement
- `PUT /api/settlements/:id` - Update settlement
- `DELETE /api/settlements/:id` - Delete settlement
- `POST /api/settlements/:id/confirm` - Confirm settlement
- `POST /api/settlements/:id/cancel` - Cancel settlement
- `GET /api/settlements/group/:groupId/suggestions` - Get settlement suggestions

## 🗄️ Database Schema

### Groups
```javascript
{
  name: String,
  description: String,
  members: [{
    userId: ObjectId,
    tempName: String,
    email: String,
    role: String, // 'admin' | 'member'
    joinedAt: Date,
    isTemporary: Boolean
  }],
  inviteToken: String,
  inviteTokenExpiry: Date,
  owner: ObjectId,
  isActive: Boolean
}
```

### Expenses
```javascript
{
  description: String,
  amount: Number,
  currency: String,
  category: String,
  date: Date,
  groupId: ObjectId,
  paidBy: ObjectId,
  splitType: String, // 'equal' | 'unequal' | 'percentage' | 'shares' | 'manual'
  splits: [{
    userId: ObjectId,
    tempName: String,
    email: String,
    amount: Number,
    percentage: Number,
    shares: Number
  }],
  notes: String,
  tags: [String],
  receiptImageUrl: String,
  createdBy: ObjectId
}
```

### Settlements
```javascript
{
  groupId: ObjectId,
  fromUser: ObjectId,
  toUser: ObjectId,
  amount: Number,
  currency: String,
  method: String, // 'cash' | 'manual' | 'bank_transfer' | 'digital'
  notes: String,
  status: String, // 'pending' | 'confirmed' | 'cancelled'
  confirmedBy: ObjectId,
  confirmedAt: Date,
  createdBy: ObjectId
}
```

## 🔧 Key Features Explained

### Balance Calculation Algorithm
The balance service uses a debt simplification algorithm that:
1. Calculates net balances for all users
2. Identifies debtors (negative balance) and creditors (positive balance)
3. Creates optimal settlement transactions to minimize the number of payments
4. Ensures total debts equal total credits

### Split Validation
- **Equal**: Amount ÷ number of people
- **Unequal**: Manual amounts must sum to total
- **Percentage**: Percentages must sum to 100%
- **Shares**: Amount allocated proportionally to shares
- **Manual**: Complete control with validation

### Invite System
- UUID-based tokens with configurable expiry
- Secure validation prevents token reuse
- Automatic token cleanup after successful join

## 🚀 Deployment

### Backend (Production)
```bash
cd splitzy-backend
npm install --production
npm start
```

### Frontend (Production)
```bash
cd splitzy-client
npm install
npm run build
# Serve the dist folder with your preferred web server
```

## 🧪 Testing

### Backend Tests
```bash
cd splitzy-backend
npm test
```

### Frontend Tests
```bash
cd splitzy-client
npm test
```

## 📈 Performance Considerations

1. **Database Indexing**: Proper indexes on frequently queried fields
2. **Pagination**: Large datasets use cursor-based pagination
3. **Caching**: Balance calculations cached where appropriate
4. **Optimized Queries**: Efficient MongoDB queries with proper projections

## 🔒 Security Features

1. **Input Validation**: All inputs validated using Joi schemas
2. **Authentication**: JWT-based authentication with refresh tokens
3. **Authorization**: Role-based access control
4. **Rate Limiting**: API rate limiting to prevent abuse
5. **CORS**: Proper CORS configuration
6. **Sanitization**: Input sanitization to prevent XSS

## 🔄 Migration Guide

For existing Splitzy installations:

1. **Backup Data**: Backup your existing database
2. **Update Code**: Pull the latest changes
3. **Install Dependencies**: New packages added (joi, uuid)
4. **Run Migration**: `node src/scripts/migrate.js`
5. **Test**: Verify all functionality works

The migration script:
- Converts string-based members to structured member objects
- Migrates splitBetween to new splits structure
- Preserves all existing data
- Adds backward compatibility

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation
- Review the migration guide for upgrade issues
