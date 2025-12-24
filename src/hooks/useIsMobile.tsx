import { useEffect, useState } from 'react'

function useIsMobile(maxWidthPx: number) {
  const getIsMobileNow = () => {
    if (typeof window === 'undefined') return false
    const w = window.visualViewport?.width ?? window.innerWidth
    return w <= maxWidthPx
  }
  const [isMobile, setIsMobile] = useState(getIsMobileNow)

  useEffect(() => {
    const onResize = () => {
      const w = window.visualViewport?.width ?? window.innerWidth
      setIsMobile(w <= maxWidthPx)
    }
    onResize()
    window.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.visualViewport?.removeEventListener('resize', onResize)
    }
  }, [maxWidthPx])

  return isMobile
}


export default useIsMobile