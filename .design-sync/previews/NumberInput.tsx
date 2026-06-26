import { NumberInput } from 'lkda-web-react'

export function Default() {
  return <NumberInput value={3} min={1} max={99} />
}

export function Disabled() {
  return <NumberInput value={1} disabled />
}
