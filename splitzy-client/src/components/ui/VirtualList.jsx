import React, { useRef, useState, useCallback } from 'react'
import { cn } from '../../lib/utils'

const VirtualList = ({
  items = [],
  itemHeight = 120,
  containerHeight = 400,
  renderItem,
  className,
  overscan = 5,
  ...props
}) => {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef(null)

  const visibleRange = useCallback(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  const visibleItems = React.useMemo(() => {
    const { startIndex, endIndex } = visibleRange()
    const itemsSlice = items.slice(startIndex, endIndex + 1)
    
    return itemsSlice.map((item, index) => ({
      item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight
    }))
  }, [items, visibleRange, itemHeight])

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop)
  }, [])

  const totalHeight = items.length * itemHeight

  return (
    <div
      ref={scrollElementRef}
      className={cn(
        'relative overflow-auto',
        className
      )}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      {...props}
    >
      {/* Spacer for total height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items */}
        {visibleItems.map(({ item, index, top }) => (
          <div
            key={typeof item.id === 'string' ? item.id : index}
            style={{
              position: 'absolute',
              top: `${top}px`,
              left: 0,
              right: 0,
              height: `${itemHeight}px`
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  )
}

export default VirtualList
