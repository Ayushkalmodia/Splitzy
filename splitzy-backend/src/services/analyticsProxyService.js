import axios from 'axios'

const getBaseUrl = () => process.env.PYTHON_SERVICE_URL || 'http://localhost:8001'

const getTimeoutMs = () => Number(process.env.PYTHON_SERVICE_TIMEOUT_MS || 5000)

const getRetries = () => Math.max(0, Math.min(5, Number(process.env.PYTHON_SERVICE_RETRIES || 2)))

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const buildProxyError = (err, timeoutMs) => {
  if (err.code === 'ECONNABORTED') {
    return {
      status: 504,
      message: 'Analytics service timeout',
      details: `FastAPI did not respond within ${timeoutMs}ms`
    }
  }

  if (err.response) {
    return {
      status: err.response.status || 502,
      message: 'Analytics service request failed',
      details: err.response.data?.message || err.response.data || 'Unknown upstream error'
    }
  }

  return {
    status: 502,
    message: 'Analytics service unavailable',
    details: err.message
  }
}

const isRetryable = (err) => {
  if (err.code === 'ECONNABORTED') return true
  const s = err.response?.status
  return s === 502 || s === 503 || s === 504
}

/**
 * Forward a request to the Python analytics service.
 * Reads `PYTHON_SERVICE_URL`, `PYTHON_SERVICE_TIMEOUT_MS`, and `PYTHON_SERVICE_RETRIES` on each call.
 */
export const proxyAnalyticsRequest = async ({ method, path, body, query }) => {
  const timeout = getTimeoutMs()
  const baseURL = getBaseUrl()
  const maxAttempts = getRetries() + 1
  let lastErr = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await axios.request({
        baseURL,
        timeout,
        method,
        url: path,
        data: body,
        params: query
      })
      return { ok: true, status: response.status, data: response.data }
    } catch (err) {
      lastErr = err
      if (attempt < maxAttempts - 1 && isRetryable(err)) {
        await sleep(200 * (attempt + 1))
        continue
      }
      return { ok: false, ...buildProxyError(err, timeout) }
    }
  }

  return { ok: false, ...buildProxyError(lastErr, timeout) }
}
