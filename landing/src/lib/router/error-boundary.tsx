import type { ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

export function AppErrorBoundary({ children }: ErrorBoundaryProps) {
  return <>{children}</>
}
