import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
  DrawerCloseButton,
  Button,
  Input,
} from 'lkda-web-react'

export function Open() {
  return (
    <Drawer open>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>编辑案卷</DrawerTitle>
          <DrawerCloseButton />
        </DrawerHeader>
        <DrawerBody>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--color-slate-title)]">案卷标题</label>
              <Input defaultValue="地质勘探报告" />
            </div>
            <p className="text-sm text-[var(--color-slate-body)]">
              电脑端从右侧滑出，手机端从底部滑出。
            </p>
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button variant="outline">取消</Button>
          <Button>保存</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
