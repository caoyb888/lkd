import { StatusTag } from 'lkda-web-react'

export function Archive() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusTag type="archive" value={0} />
      <StatusTag type="archive" value={1} />
      <StatusTag type="archive" value={2} />
      <StatusTag type="archive" value={3} />
      <StatusTag type="archive" value={11} />
    </div>
  )
}

export function Stock() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusTag type="stock" value={1} />
      <StatusTag type="stock" value={0} />
    </div>
  )
}

export function Borrow() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusTag type="borrow" value={0} />
      <StatusTag type="borrow" value={1} remainDays={10} />
      <StatusTag type="borrow" value={1} remainDays={2} />
      <StatusTag type="borrow" value={1} remainDays={-3} />
      <StatusTag type="borrow" value={3} />
    </div>
  )
}
