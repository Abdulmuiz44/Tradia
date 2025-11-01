import type { Metadata } from 'next'
import './globals.css'
import { ChatProvider } from '@/contexts/chat-context'
import { QueryProvider } from '@/components/providers/query-provider'

export const metadata: Metadata = {
	title: 'Cipher UI',
	description: 'Interactive web interface for the Cipher AI agent framework',
	icons: {
		icon: '/favicon.png',
		shortcut: '/favicon.png',
		apple: '/favicon.png',
	},
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en" className="dark">
			<body className="antialiased bg-background text-foreground">
        <QueryProvider>
          <ChatProvider>
            <div className="flex h-screen w-screen flex-col">{children}</div>
          </ChatProvider>
        </QueryProvider>
      </body>
		</html>
	)
}