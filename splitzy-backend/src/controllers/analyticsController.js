import { proxyAnalyticsRequest } from '../services/analyticsProxyService.js'

const respondFromProxy = (res, result) => {
  if (result.ok) {
    return res.status(result.status).json(result.data)
  }
  return res.status(result.status).json({
    message: result.message,
    details: result.details
  })
}

export const categorize = async (req, res) => {
  const result = await proxyAnalyticsRequest({
    method: 'post',
    path: '/categorize',
    body: req.body
  })
  return respondFromProxy(res, result)
}

export const detectAnomaly = async (req, res) => {
  const result = await proxyAnalyticsRequest({
    method: 'post',
    path: '/detect-anomaly',
    body: req.body
  })
  return respondFromProxy(res, result)
}

export const monthlyReport = async (req, res) => {
  const result = await proxyAnalyticsRequest({
    method: 'get',
    path: '/monthly-report',
    query: req.query
  })
  return respondFromProxy(res, result)
}

export const optimizeSettlement = async (req, res) => {
  const result = await proxyAnalyticsRequest({
    method: 'post',
    path: '/optimize-settlement',
    body: req.body
  })
  return respondFromProxy(res, result)
}

/** ML expense category — forwards to FastAPI `POST /categorize-expense`. */
export const categorizeExpenseMl = async (req, res) => {
  const result = await proxyAnalyticsRequest({
    method: 'post',
    path: '/categorize-expense',
    body: req.body
  })
  return respondFromProxy(res, result)
}
