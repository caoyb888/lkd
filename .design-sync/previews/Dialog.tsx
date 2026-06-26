import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from 'lkda-web-react'

export function Open() {
  return (
    <Dialog open>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>确认归档</DialogTitle>
          <DialogDescription>
            归档后该案卷将正式入库，全员可查且不可修改。确定继续吗？
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">取消</Button>
          <Button>确认归档</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
