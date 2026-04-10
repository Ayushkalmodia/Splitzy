import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Group from '../models/Group.js'
import Expense from '../models/Expense.js'
import User from '../models/User.js'

dotenv.config()

const migrate = async () => {
  try {
    console.log('Starting migration...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/splitzy')
    console.log('Connected to MongoDB')

    // Migrate Groups
    console.log('Migrating Groups...')
    const groups = await Group.find({})
    
    for (const group of groups) {
      let needsUpdate = false
      
      // Check if group has old string-based members
      if (group.members && group.members.length > 0 && typeof group.members[0] === 'string') {
        console.log(`Migrating group: ${group.name}`)
        
        // Convert string members to new structure
        const newMembers = []
        
        for (const memberEmail of group.members) {
          // Try to find user by email
          const user = await User.findOne({ email: memberEmail.toLowerCase().trim() })
          
          if (user) {
            newMembers.push({
              userId: user._id,
              email: user.email,
              role: user._id.toString() === group.owner.toString() ? 'admin' : 'member',
              joinedAt: group.createdAt,
              isTemporary: false
            })
          } else {
            // Create temporary user
            newMembers.push({
              userId: null,
              email: memberEmail,
              tempName: memberEmail.split('@')[0],
              role: 'member',
              joinedAt: group.createdAt,
              isTemporary: true
            })
          }
        }
        
        group.members = newMembers
        needsUpdate = true
      }
      
      // Ensure owner is in members with admin role
      const ownerMember = group.members.find(m => 
        m.userId && m.userId.toString() === group.owner.toString()
      )
      
      if (!ownerMember) {
        group.members.push({
          userId: group.owner,
          role: 'admin',
          joinedAt: group.createdAt,
          isTemporary: false
        })
        needsUpdate = true
      }
      
      if (needsUpdate) {
        await group.save()
        console.log(`Updated group: ${group.name}`)
      }
    }

    // Migrate Expenses
    console.log('Migrating Expenses...')
    const expenses = await Expense.find({})
    
    for (const expense of expenses) {
      let needsUpdate = false
      
      // Check if expense has old splitBetween array
      if (expense.splitBetween && expense.splitBetween.length > 0) {
        console.log(`Migrating expense: ${expense.description}`)
        
        // Convert splitBetween to new splits structure
        const newSplits = []
        const equalAmount = expense.amount / expense.splitBetween.length
        
        for (const splitEmail of expense.splitBetween) {
          // Try to find user by email
          const user = await User.findOne({ email: splitEmail.toLowerCase().trim() })
          
          if (user) {
            newSplits.push({
              userId: user._id,
              email: user.email,
              amount: equalAmount,
              percentage: (100 / expense.splitBetween.length),
              shares: 1
            })
          } else {
            // Create temporary split
            newSplits.push({
              userId: null,
              email: splitEmail,
              tempName: splitEmail.split('@')[0],
              amount: equalAmount,
              percentage: (100 / expense.splitBetween.length),
              shares: 1
            })
          }
        }
        
        expense.splits = newSplits
        expense.splitType = 'equal'
        needsUpdate = true
      }
      
      // Convert paidBy from string to ObjectId if possible
      if (typeof expense.paidBy === 'string' && expense.paidBy.includes('@')) {
        const user = await User.findOne({ email: expense.paidBy.toLowerCase().trim() })
        if (user) {
          expense.paidBy = user._id
          needsUpdate = true
        }
      }
      
      if (needsUpdate) {
        await expense.save()
        console.log(`Updated expense: ${expense.description}`)
      }
    }

    console.log('Migration completed successfully!')
    
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
}

export default migrate
