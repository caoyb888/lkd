import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  Button,
} from 'lkda-web-react'

export function Open() {
  return (
    <TooltipProvider>
      <Tooltip open>
        <TooltipTrigger asChild>
          <Button variant="outline">销毁</Button>
        </TooltipTrigger>
        <TooltipContent>需领导审批后方可销毁</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
