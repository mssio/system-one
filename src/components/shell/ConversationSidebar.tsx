import { TrashIcon } from '@heroicons/react/16/solid';
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Button } from '../catalyst/button';
import { Dialog, DialogActions, DialogDescription, DialogTitle } from '../catalyst/dialog';
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from '../catalyst/sidebar';
import { useAuth } from '../../auth/AuthProvider';
import { useConversations } from '../../storage/ConversationProvider';
import { ThemeControl } from './ThemeControl';

export function ConversationSidebar() {
  const { store, deleteConversation } = useConversations();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);

  const conversations = [...store.conversations].sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : -1,
  );

  return (
    <Sidebar className="h-full min-h-0 flex-1 bg-white dark:bg-zinc-900">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-1">
          <span className="grid size-9 place-items-center rounded-xl bg-zinc-950 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950">
            J
          </span>
          <span>
            <span className="block text-sm font-semibold text-zinc-950 dark:text-white">Jev</span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">System One</span>
          </span>
        </div>
        <Button href="/" color="indigo" className="mt-4 w-full">
          New chat
        </Button>
      </SidebarHeader>
      <SidebarBody>
        <SidebarSection>
          <SidebarHeading>Conversations</SidebarHeading>
          {conversations.length === 0 ? (
            <p className="px-2 text-sm text-zinc-500 dark:text-zinc-400">No conversations yet.</p>
          ) : (
            conversations.map((conversation) => (
              <div key={conversation.id} className="flex items-center gap-1">
                <SidebarItem
                  href={`/c/${conversation.id}`}
                  current={conversation.id === conversationId}
                  className="min-w-0 flex-1"
                >
                  <SidebarLabel className="truncate">{conversation.title}</SidebarLabel>
                </SidebarItem>
                <button
                  type="button"
                  className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-950/5 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:bg-white/5 dark:hover:text-white"
                  aria-label={`Delete ${conversation.title}`}
                  onClick={() => {
                    setPendingDelete({ id: conversation.id, title: conversation.title });
                  }}
                >
                  <TrashIcon className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </SidebarSection>
      </SidebarBody>
      <SidebarFooter>
        <div className="space-y-3 px-1">
          <ThemeControl />
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>{auth.bypass ? 'Local session' : 'Signed in'}</span>
            {auth.bypass ? null : (
              <Button plain href="/sign-out">
                Sign out
              </Button>
            )}
          </div>
        </div>
      </SidebarFooter>
      <Dialog
        open={pendingDelete !== null}
        onClose={() => {
          setPendingDelete(null);
        }}
      >
        <DialogTitle>Delete conversation</DialogTitle>
        <DialogDescription>
          {pendingDelete
            ? `“${pendingDelete.title}” will be removed from this browser.`
            : 'This conversation will be removed from this browser.'}
        </DialogDescription>
        <DialogActions>
          <Button
            plain
            onClick={() => {
              setPendingDelete(null);
            }}
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={() => {
              if (!pendingDelete) return;
              deleteConversation(pendingDelete.id);
              if (location.pathname === `/c/${pendingDelete.id}`) {
                void navigate('/');
              }
              setPendingDelete(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Sidebar>
  );
}
