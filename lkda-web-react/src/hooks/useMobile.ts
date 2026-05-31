import { useMediaQuery } from './useMediaQuery'

export function useMobile(): boolean {
  return !useMediaQuery('(min-width: 768px)')
}
