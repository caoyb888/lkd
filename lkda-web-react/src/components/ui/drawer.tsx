import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

const Drawer = DialogPrimitive.Root
const DrawerTrigger = DialogPrimitive.Trigger

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 bg-white p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out',
        'md:right-0 md:top-0 md:h-full md:w-[400px] md:data-[state=closed]:slide-out-to-right md:data-[state=open]:slide-in-from-right',
        'max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:rounded-t-card max-md:data-[state=closed]:slide-out-to-bottom max-md:data-[state=open]:slide-in-from-bottom',
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
DrawerContent.displayName = 'DrawerContent'

export { Drawer, DrawerTrigger, DrawerContent }
