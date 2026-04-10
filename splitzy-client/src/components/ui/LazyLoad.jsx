import React, { Suspense, lazy } from 'react'
import LoadingSpinner from './LoadingSpinner.jsx'

const LazyLoad = ({ componentLoader, fallback = <LoadingSpinner />, ...props }) => {
  const LazyComponent = lazy(componentLoader)
  
  return (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  )
}

export default LazyLoad
