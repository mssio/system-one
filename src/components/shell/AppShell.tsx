import { Bars3Icon, XMarkIcon } from '@heroicons/react/20/solid';
import * as Headless from '@headlessui/react';
import { useState } from 'react';
import { Outlet, useLocation, useParams } from 'react-router';
import { NavbarItem } from '../catalyst/navbar';
import { useConversations } from '../../storage/ConversationProvider';
import { ConversationSidebar } from './ConversationSidebar';

export function AppShell() {
  const location = useLocation();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const sidebarOpen = openPath === location.pathname;

  return (
    <div className="flex h-svh bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="hidden w-64 shrink-0 border-r border-zinc-950/5 lg:block dark:border-white/10">
        <ConversationSidebar />
      </div>
      <MobileSidebar
        open={sidebarOpen}
        onClose={() => {
          setOpenPath(null);
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-zinc-950/5 px-2 lg:hidden dark:border-white/10">
          <NavbarItem
            aria-label="Open navigation"
            onClick={() => {
              setOpenPath(location.pathname);
            }}
          >
            <Bars3Icon data-slot="icon" />
          </NavbarItem>
          <MobileTitle />
        </header>
        <div className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function MobileTitle() {
  const { conversationId } = useParams();
  const { store } = useConversations();
  const conversation = store.conversations.find((item) => item.id === conversationId);
  return (
    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
      {conversation?.title ?? 'Jev'}
    </span>
  );
}

function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Headless.Dialog open={open} onClose={onClose} className="lg:hidden">
      <Headless.DialogBackdrop
        transition
        className="fixed inset-0 bg-black/30 transition data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />
      <Headless.DialogPanel
        transition
        className="fixed inset-y-0 left-0 w-full max-w-80 p-2 transition duration-300 ease-in-out data-closed:-translate-x-full"
      >
        <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
          <div className="px-3 pt-3">
            <Headless.CloseButton as={NavbarItem} aria-label="Close navigation">
              <XMarkIcon data-slot="icon" />
            </Headless.CloseButton>
          </div>
          <ConversationSidebar />
        </div>
      </Headless.DialogPanel>
    </Headless.Dialog>
  );
}
