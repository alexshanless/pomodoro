import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

let mockAuthListener;

jest.mock('../lib/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

const { supabase } = require('../lib/supabaseClient');

// CRA's Jest preset resets mock implementations before each test.
beforeEach(() => {
  supabase.auth.onAuthStateChange.mockImplementation((cb) => {
    mockAuthListener = cb;
    return { data: { subscription: { unsubscribe: jest.fn() } } };
  });
});

const makeUser = (id, metadata = {}) => ({ id, email: `${id}@example.com`, user_metadata: metadata });
const sessionFor = (user) => ({ access_token: Math.random().toString(), user });

const renderAuth = async (initialUser) => {
  supabase.auth.getSession.mockResolvedValue({ data: { session: sessionFor(initialUser) } });
  const hook = renderHook(() => useAuth(), { wrapper: AuthProvider });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
};

const emit = (event, user) => act(() => { mockAuthListener(event, user ? sessionFor(user) : null); });

describe('AuthProvider user identity', () => {
  it('keeps the same user reference across same-id auth events', async () => {
    const { result } = await renderAuth(makeUser('u1'));
    const original = result.current.user;
    const originalSession = result.current.session;

    emit('SIGNED_IN', makeUser('u1'));
    emit('TOKEN_REFRESHED', makeUser('u1'));

    expect(result.current.user).toBe(original);
    expect(result.current.session).not.toBe(originalSession);
  });

  it('replaces the user on USER_UPDATED so profile edits propagate', async () => {
    const { result } = await renderAuth(makeUser('u1', { name: 'Old' }));
    const original = result.current.user;

    emit('USER_UPDATED', makeUser('u1', { name: 'New' }));

    expect(result.current.user).not.toBe(original);
    expect(result.current.user.user_metadata.name).toBe('New');
  });

  it('switches to a different user', async () => {
    const { result } = await renderAuth(makeUser('u1'));

    emit('SIGNED_IN', makeUser('u2'));

    expect(result.current.user.id).toBe('u2');
  });

  it('clears the user on sign-out', async () => {
    const { result } = await renderAuth(makeUser('u1'));

    emit('SIGNED_OUT', null);

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
