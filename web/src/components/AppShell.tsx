/**
 * Persistent left sidebar shell for /chat page.
 *
 * Mirrors ColdIQ's layout: logo + collapse toggle, primary nav,
 * recent conversations list, secondary nav, and pinned bottom section.
 */
import { useEffect, useState } from 'react'
import {
  BarChart3,
  Brain,
  Home,
  KeyRound,
  Layers,
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Sun,
  User,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ConversationSummary {
  id: string
  title: string
  updatedAt?: string | null
}

const PRIMARY_LINKS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/chat', label: 'Chats', icon: MessageSquare },
]

const SECONDARY_LINKS = [
  { href: '/skills', label: 'Browse Skills', icon: Layers },
  { href: '/today', label: 'Today', icon: Sun },
  { href: '/brain', label: 'Brain', icon: Brain },
  { href: '/visualizations', label: 'Visualizations', icon: BarChart3 },
]

function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: typeof Home
}) {
  const active =
    typeof window !== 'undefined' &&
    (href === '/'
      ? window.location.pathname === '/'
      : window.location.pathname.startsWith(href))
  return (
    <a
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-background text-foreground' : 'text-muted-foreground hover:bg-background hover:text-foreground',
      )}
    >
      <Icon size={16} strokeWidth={2} className="shrink-0" />
      {label}
    </a>
  )
}

export interface AppShellProps {
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  refreshKey?: number
  children: React.ReactNode
}

export function AppShell({
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  refreshKey,
  children,
}: AppShellProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .get<{ conversations: ConversationSummary[] }>('/api/chat/conversations')
      .then((res) => {
        if (!cancelled) setConversations(res.conversations ?? [])
      })
      .catch(() => {
        // Best-effort — an empty recent list is fine.
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return (
    <div className="min-h-screen flex">
      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Open sidebar"
          className="fixed left-3 top-3 z-20 rounded-md border border-border bg-card p-2 text-muted-foreground hover:text-foreground shadow-sm"
        >
          <PanelLeft size={16} />
        </button>
      ) : (
        <aside className="w-64 shrink-0 border-r border-border bg-card flex flex-col h-screen sticky top-0">
          {/* Logo + collapse */}
          <div className="flex items-center justify-between px-5 py-4">
            <a href="/" className="flex items-center gap-2">
              <span
                className="font-heading text-lg font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: 'var(--brand-gradient)' }}
              >
                YALC
              </span>
            </a>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
            >
              <PanelLeftClose size={16} />
            </button>
          </div>

          {/* Primary nav */}
          <nav className="px-3 space-y-0.5">
            {PRIMARY_LINKS.map((l) => (
              <NavLink key={l.href} {...l} />
            ))}
          </nav>

          {/* Recent conversations */}
          <div className="px-3 pt-5 pb-2 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Recent conversations
              </span>
              <button
                type="button"
                onClick={onNewConversation}
                title="New conversation"
                data-testid="new-conversation"
                className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="overflow-y-auto min-h-0">
              {conversations.length === 0 ? (
                <p className="px-3 py-1 text-xs text-muted-foreground italic">No conversations yet.</p>
              ) : (
                <ul className="space-y-0.5">
                  {conversations.map((conv) => (
                    <li key={conv.id}>
                      <button
                        type="button"
                        onClick={() => onSelectConversation(conv.id)}
                        className={cn(
                          'w-full truncate text-left rounded-md px-3 py-1.5 text-sm transition-colors',
                          conv.id === activeConversationId
                            ? 'bg-background font-medium text-foreground'
                            : 'text-muted-foreground hover:bg-background',
                        )}
                        title={conv.title}
                      >
                        {conv.title || 'New Conversation'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Secondary nav */}
          <div className="px-3 py-3 border-t border-border space-y-0.5">
            {SECONDARY_LINKS.map((l) => (
              <NavLink key={l.href} {...l} />
            ))}
          </div>

          {/* Bottom: settings + user */}
          <div className="px-3 py-3 border-t border-border space-y-0.5">
            <NavLink href="/keys" label="Settings" icon={KeyRound} />
            <div className="flex items-center gap-3 px-3 py-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background border border-border text-muted-foreground">
                <User size={14} />
              </span>
              <span className="text-sm text-foreground truncate">Local operator</span>
            </div>
          </div>
        </aside>
      )}

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
