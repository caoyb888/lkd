import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

const Drawer = DialogPrimitive.Root
const DrawerTrigger = DialogPrimitive.Trigger
const DrawerClose = DialogPrimitive.Close

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 bg-[var(--color-bg-main)] shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out',
        // Desktop: slide from right
        'md:right-0 md:top-0 md:h-full md:w-[400px] md:rounded-l-card md:border-l md:data-[state=closed]:slide-out-to-right md:data-[state=open]:slide-in-from-right',
        // Mobile: slide from bottom (full screen)
        'max-md:inset-x-0 max-md:bottom-0 max-md:top-12 max-md:rounded-t-card max-md:border-t max-md:data-[state=closed]:slide-out-to-bottom max-md:data-[state=open]:slide-in-from-bottom',
        'flex flex-col',
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
DrawerContent.displayName = 'DrawerContent'

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-light)]',
      className
    )}
    {...props}
  />
)
DrawerHeader.displayName = 'DrawerHeader'

const DrawerTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn(
      'text-lg font-semibold text-[var(--color-slate-title)]',
      className
    )}
    {...props}
  />
)
DrawerTitle.displayName = 'DrawerTitle'

const DrawerBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex-1 overflow-y-auto px-6 py-4', className)} {...props} />
)
DrawerBody.displayName = 'DrawerBody'

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse md:flex-row md:justify-end gap-2 px-6 py-4 border-t border-[var(--color-border-light)] bg-[var(--color-bg-main)]',
      className
    )}
    {...props}
  />
)
DrawerFooter.displayName = 'DrawerFooter'

const DrawerCloseButton = ({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <DrawerClose
    className={cn(
      'rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
      className
    )}
    {...props}
  >
    <X size={18} />
    <span className="sr-only">关闭</span>
  </DrawerClose>
)
DrawerCloseButton.displayName = 'DrawerCloseButton'

export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
  DrawerCloseButton,
}
