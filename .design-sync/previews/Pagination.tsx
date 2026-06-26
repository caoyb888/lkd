import { Pagination } from 'lkda-web-react'

const noop = () => {}

export function Middle() {
  return <Pagination current={4} total={10} onChange={noop} />
}

export function FewPages() {
  return <Pagination current={2} total={5} onChange={noop} />
}
