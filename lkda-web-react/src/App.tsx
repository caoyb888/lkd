import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { router } from '@/routes'
import { Toaster, toast } from 'sonner'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error((error as Error)?.message || '数据加载失败，请稍后重试')
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error((error as Error)?.message || '操作失败，请稍后重试')
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 3,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  )
}

export default App
