import { Tabs, TabsList, TabsTrigger, TabsContent } from 'lkda-web-react'

export function Basic() {
  return (
    <Tabs defaultValue="base" className="w-96">
      <TabsList>
        <TabsTrigger value="base">基本信息</TabsTrigger>
        <TabsTrigger value="files">卷内文件</TabsTrigger>
        <TabsTrigger value="log">操作日志</TabsTrigger>
      </TabsList>
      <TabsContent value="base">
        <div className="pt-4 text-sm text-[var(--color-slate-body)]">
          案卷标题、全宗号、保管期限等基本编目信息。
        </div>
      </TabsContent>
      <TabsContent value="files">
        <div className="pt-4 text-sm text-[var(--color-slate-body)]">
          本案卷内的文件级明细目录列表。
        </div>
      </TabsContent>
      <TabsContent value="log">
        <div className="pt-4 text-sm text-[var(--color-slate-body)]">
          归档、借阅、销毁等操作的审计日志。
        </div>
      </TabsContent>
    </Tabs>
  )
}
