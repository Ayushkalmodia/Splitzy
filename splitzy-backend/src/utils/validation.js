import Joi from 'joi'

// User validation schemas
export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
})

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
})

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
})

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
})

export const createGroupSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  description: Joi.string().trim().max(500).optional(),
  members: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .optional()
})

export const updateGroupSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  description: Joi.string().trim().max(500).optional(),
  members: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .optional()
})

export const inviteToGroupSchema = Joi.object({
  token: Joi.string().required()
})

export const expenseQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  groupId: Joi.string().optional(),
  category: Joi.string().optional(),
  search: Joi.string().optional(),
  q: Joi.string().optional(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  sort: Joi.string().optional()
})

// Expense validation schemas
export const createExpenseSchema = Joi.object({
  description: Joi.string().trim().min(1).max(200).required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).default('USD'),
  category: Joi.string().trim().default('other'),
  /** When true, server keeps client `category` and only stores ML metadata. */
  categoryManuallySelected: Joi.boolean().optional(),
  merchant: Joi.string().trim().max(120).allow('').optional(),
  date: Joi.date().optional(),
  groupId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  paidBy: Joi.alternatives().try(
    Joi.string().email(),
    Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
  ).optional(),
  splitType: Joi.string().valid('equal', 'unequal', 'percentage', 'shares', 'manual').default('equal'),
  splits: Joi.array().items(
    Joi.object({
      userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      amount: Joi.number().min(0).optional(),
      percentage: Joi.number().min(0).max(100).optional(),
      shares: Joi.number().min(0).optional()
    })
  ).when('splitType', {
    is: 'equal',
    then: Joi.optional(),
    otherwise: Joi.array().min(1).required()
  }),
  notes: Joi.string().trim().max(1000).allow('').optional(),
  tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
  receiptImageUrl: Joi.string().uri().optional(),
  // Backward compatibility
  splitBetween: Joi.array().items(Joi.string().email()).optional()
})

export const updateExpenseSchema = Joi.object({
  description: Joi.string().trim().min(1).max(200).optional(),
  amount: Joi.number().positive().optional(),
  currency: Joi.string().length(3).optional(),
  category: Joi.string().trim().optional(),
  categoryManuallySelected: Joi.boolean().optional(),
  merchant: Joi.string().trim().max(120).allow('').optional(),
  date: Joi.date().optional(),
  groupId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  paidBy: Joi.string().optional(),
  splitType: Joi.string().valid('equal', 'unequal', 'percentage', 'shares', 'manual').optional(),
  splits: Joi.array().items(
    Joi.object({
      userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      amount: Joi.number().min(0).optional(),
      percentage: Joi.number().min(0).max(100).optional(),
      shares: Joi.number().min(0).optional()
    })
  ).when('splitType', {
    is: 'equal',
    then: Joi.optional(),
    otherwise: Joi.array().min(1).required()
  }),
  notes: Joi.string().trim().max(1000).allow('').optional(),
  tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
  receiptImageUrl: Joi.string().uri().optional(),
  // Backward compatibility
  splitBetween: Joi.array().items(Joi.string().email()).optional()
})

// Settlement validation schemas
export const createSettlementSchema = Joi.object({
  groupId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  fromUser: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  toUser: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  amount: Joi.number().positive().required(),
  method: Joi.string().valid('cash', 'manual', 'bank_transfer', 'digital').default('manual'),
  notes: Joi.string().trim().max(1000).optional()
})

export const updateSettlementSchema = Joi.object({
  amount: Joi.number().positive().optional(),
  method: Joi.string().valid('cash', 'manual', 'bank_transfer', 'digital').optional(),
  notes: Joi.string().trim().max(1000).optional(),
  status: Joi.string().valid('pending', 'confirmed', 'cancelled').optional()
})

// Pagination validation
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'confirmed', 'cancelled').optional(),
  sort: Joi.string().optional(),
  groupId: Joi.string().optional()
})

export const budgetMonthQuerySchema = Joi.object({
  month: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .required()
})

export const createBudgetSchema = Joi.object({
  category: Joi.string().trim().min(1).max(60).required(),
  monthlyLimit: Joi.number().min(0).required(),
  currency: Joi.string().length(3).uppercase().default('USD')
})

export const updateBudgetSchema = Joi.object({
  category: Joi.string().trim().min(1).max(60).optional(),
  monthlyLimit: Joi.number().min(0).optional(),
  currency: Joi.string().length(3).uppercase().optional()
})

// Validation middleware factory
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[source])
    if (error) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.details.reduce((acc, detail) => {
          const key = detail.path.join('.')
          acc[key] = detail.message
          return acc
        }, {})
      })
    }
    next()
  }
}
