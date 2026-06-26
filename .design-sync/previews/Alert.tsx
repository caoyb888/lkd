import { Alert, AlertTitle, AlertDescription } from 'lkda-web-react'

export function Variants() {
  return (
    <div className="w-full max-w-md space-y-3">
      <Alert variant="default">
        <AlertTitle>提示</AlertTitle>
        <AlertDescription>这是一条普通提示信息。</AlertDescription>
      </Alert>
      <Alert variant="success">
        <AlertTitle>归档成功</AlertTitle>
        <AlertDescription>案卷已正式归档，全员可查。</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <AlertTitle>请注意</AlertTitle>
        <AlertDescription>该档案借阅将于 3 天后到期。</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTitle>操作失败</AlertTitle>
        <AlertDescription>档号已存在，请检查后重试。</AlertDescription>
      </Alert>
    </div>
  )
}
