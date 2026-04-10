import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

/**
 * Custom hook for debouncing values
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} Debounced value
 */
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Custom hook for memoized expensive calculations
 * @param {Function} calculation - Expensive calculation function
 * @param {Array} dependencies - Dependency array
 * @returns {any} Memoized result
 */
export const useMemoizedCalculation = (calculation, dependencies) => {
  return useMemo(calculation, [calculation, ...dependencies])
}

/**
 * Custom hook for memoized callback functions
 * @param {Function} callback - Callback function
 * @param {Array} dependencies - Dependency array
 * @returns {Function} Memoized callback
 */
export const useMemoizedCallback = (callback, dependencies) => {
  return useCallback(callback, [callback, ...dependencies])
}

/**
 * Custom hook for virtual scrolling
 * @param {Array} items - Array of items to virtualize
 * @param {number} itemHeight - Height of each item in pixels
 * @param {number} containerHeight - Height of container in pixels
 * @returns {Object} Virtual scrolling utilities
 */
export const useVirtualScroll = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0)
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    )
    
    return items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight
    }))
  }, [items, itemHeight, containerHeight, scrollTop])

  const totalHeight = items.length * itemHeight

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop)
  }, [])

  return {
    visibleItems,
    totalHeight,
    handleScroll
  }
}

/**
 * Custom hook for lazy loading components
 * @param {Function} importFunction - Dynamic import function
 * @returns {Object} Lazy loading utilities
 */
export const useLazyLoad = (importFunction) => {
  const [component, setComponent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    const loadComponent = async () => {
      try {
        setLoading(true)
        const module = await importFunction()
        if (isMounted) {
          setComponent(module.default)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError(err)
          setComponent(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadComponent()

    return () => {
      isMounted = false
    }
  }, [importFunction])

  return { component, loading, error }
}

/**
 * Custom hook for performance monitoring
 * @returns {Object} Performance monitoring utilities
 */
export const usePerformanceMonitor = () => {
  const metricsRef = useRef({
    renderCount: 0,
    lastRenderTime: Date.now(),
    renderTimes: []
  })

  const trackRender = useCallback(() => {
    const now = Date.now()
    const timeSinceLastRender = now - metricsRef.current.lastRenderTime
    
    metricsRef.current.renderCount++
    metricsRef.current.lastRenderTime = now
    metricsRef.current.renderTimes.push(timeSinceLastRender)
    
    // Keep only last 10 render times
    if (metricsRef.current.renderTimes.length > 10) {
      metricsRef.current.renderTimes.shift()
    }
  }, [])

  const getAverageRenderTime = useCallback(() => {
    const times = metricsRef.current.renderTimes
    if (times.length === 0) return 0
    return times.reduce((sum, time) => sum + time, 0) / times.length
  }, [])

  const getMetrics = useCallback(() => ({
    renderCount: metricsRef.current.renderCount,
    averageRenderTime: getAverageRenderTime(),
    lastRenderTime: metricsRef.current.lastRenderTime
  }), [getAverageRenderTime])

  return {
    trackRender,
    getMetrics
  }
}

/**
 * Custom hook for optimized list filtering
 * @param {Array} items - Items to filter
 * @param {Function} filterFunction - Filter function
 * @param {Array} dependencies - Filter dependencies
 * @returns {Array} Filtered items
 */
export const useOptimizedFilter = (items, filterFunction) => {
  return useMemo(() => {
    return items.filter(filterFunction)
  }, [items, filterFunction])
}

/**
 * Custom hook for cached API calls
 * @param {Function} apiFunction - API function to cache
 * @param {Array} dependencies - Cache dependencies
 * @param {number} cacheTime - Cache time in milliseconds
 * @returns {Object} Cached API utilities
 */
export const useCachedApi = (apiFunction, cacheTime = 300000) => {
  const cacheRef = useRef(new Map())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async (...args) => {
    const cacheKey = JSON.stringify(args)
    const cached = cacheRef.current.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      setData(cached.data)
      return cached.data
    }

    try {
      setLoading(true)
      const result = await apiFunction(...args)
      
      cacheRef.current.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      })
      
      setData(result)
      setError(null)
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiFunction, cacheTime])

  const invalidateCache = useCallback(() => {
    cacheRef.current.clear()
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    invalidateCache
  }
}
