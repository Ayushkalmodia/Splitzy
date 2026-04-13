import { useState, useEffect, useMemo, useCallback } from 'react'

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

export const useMemoizedCalculation = (calculation, dependencies) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(calculation, dependencies)
}

export const useMemoizedCallback = (callback, dependencies) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(callback, dependencies)
}

export const useOptimizedFilter = (items, filterFunction) => {
  return useMemo(() => {
    return items.filter(filterFunction)
  }, [items, filterFunction])
}
