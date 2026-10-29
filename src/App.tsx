import { Navigate, Route, Routes } from 'react-router';
import { RequireAuth } from './auth/RequireAuth';
import { ChatView } from './components/chat/ChatView';
import { AppShell } from './components/shell/AppShell';
import { CallbackPage, SignInPage, SignOutPage } from './pages/AuthPages';
import { ConversationProvider } from './storage/ConversationProvider';

export function App() {
  return (
    <ConversationProvider>
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/callback" element={<CallbackPage />} />
        <Route path="/sign-out" element={<SignOutPage />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<ChatView />} />
          <Route path="/c/:conversationId" element={<ChatView />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ConversationProvider>
  );
}
