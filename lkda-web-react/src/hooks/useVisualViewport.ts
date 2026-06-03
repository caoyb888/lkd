import { useState, useEffect } from 'react'

/**
 * 监听 visualViewport 变化，用于处理手机端虚拟键盘弹出时
 * 底部固定按钮被顶出可视区的问题。
 *
 * 返回当前键盘高度（0 表示键盘收起）
 */
export function useVisualViewport() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const visualViewport = window.visualViewport
    if (!visualViewport) return

    function handleResize() {
      const vh = visualViewport?.height ?? window.innerHeight
      const wh = window.innerHeight
      const diff = Math.max(0, wh - vh)
      // 差值大于 100px 视为键盘弹出
      setKeyboardHeight(diff > 100 ? diff : 0)
    }

    visualViewport.addEventListener('resize', handleResize)
    visualViewport.addEventListener('scroll', handleResize)
    handleResize()

    return () => {
      visualViewport.removeEventListener('resize', handleResize)
      visualViewport.removeEventListener('scroll', handleResize)
    }
  }, [])

  return keyboardHeight
}
