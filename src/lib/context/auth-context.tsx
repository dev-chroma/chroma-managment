'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, SystemRole } from '@/types/database';
import { INITIAL_PROFILES } from '@/lib/mock/initial-data';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

interface UserAccount extends Profile {
  password?: string;
  department_id?: string | null;
}

interface AuthContextType {
  user: Profile | null;
  role: SystemRole;
  isLiveSupabase: boolean;
  allProfiles: Profile[];
  login: (usernameOrEmail: string, password?: string) => Promise<{ error?: string }>;
  logout: () => void;
  createAccount: (data: {
    full_name: string;
    email: string;
    role: SystemRole;
    department_id?: string;
    password?: string;
    avatar_url?: string;
  }) => Promise<{ error?: string; user?: Profile }>;
  updateAccount: (
    userId: string,
    data: {
      full_name?: string;
      email?: string;
      phone?: string;
      bio?: string;
      password?: string;
      avatar_url?: string;
      system_role?: SystemRole;
      department_id?: string | null;
      is_active?: boolean;
    }
  ) => Promise<{ error?: string; user?: Profile }>;
  toggleUserActive: (userId: string) => Promise<boolean>;
  deleteAccount: (userId: string) => Promise<{ error?: string; success?: boolean }>;
  getAccountPassword: (userId: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USER = 'chromadiaries_auth_user';
const STORAGE_KEY_ACCOUNTS = 'chromadiaries_user_accounts';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [profiles, setProfiles] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize accounts and check existing login
  useEffect(() => {
    // 1. Initial Owner account
    const defaultOwner: UserAccount = {
      ...INITIAL_PROFILES[0],
      password: 'admin@123',
    };

    // 2. Load stored accounts from localStorage or initialize with Owner
    let accounts: UserAccount[] = [defaultOwner];
    if (typeof window !== 'undefined') {
      const storedAccs = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      if (storedAccs) {
        try {
          const parsed = JSON.parse(storedAccs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            accounts = parsed;
          }
        } catch {
          // ignore parse error
        }
      }

      // Ensure all INITIAL_PROFILES exist in accounts
      INITIAL_PROFILES.forEach((initP) => {
        if (!accounts.some((a) => a.email.toLowerCase() === initP.email.toLowerCase())) {
          accounts.push({
            ...initP,
            password: initP.system_role === 'admin' ? 'admin@123' : 'member@123',
          });
        }
      });

      // Check saved session
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setCurrentUser(parsedUser);
        } catch {
          setCurrentUser(null);
        }
      }
    }

    setProfiles(accounts);

    // Also fetch live Supabase profiles if available
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('department_members').select('*'),
        ]).then(([{ data: profData, error: profErr }, { data: memberData }]) => {
          if (!profErr && profData && profData.length > 0) {
            const memberDeptMap = new Map<string, { deptId: string; role: string }>();
            if (memberData) {
              memberData.forEach((m: any) => {
                memberDeptMap.set(m.user_id, { deptId: m.department_id, role: m.role });
              });
            }

            setProfiles((prev) => {
              const map = new Map<string, UserAccount>();
              prev.forEach((p) => map.set(p.email.toLowerCase(), p));
              profData.forEach((p: any) => {
                const existing = map.get(p.email.toLowerCase());
                const deptInfo = memberDeptMap.get(p.id);
                map.set(p.email.toLowerCase(), {
                  ...p,
                  department_id: deptInfo ? deptInfo.deptId : (existing?.department_id || null),
                  password: existing?.password || 'member@123',
                });
              });
              return Array.from(map.values());
            });
          }
        });
      }
    }

    setIsLoading(false);
  }, []);

  // Route protection: If unauthenticated, redirect to /login
  useEffect(() => {
    if (!isLoading) {
      if (!currentUser && pathname !== '/login') {
        router.push('/login');
      }
    }
  }, [currentUser, pathname, isLoading, router]);

  const login = async (usernameOrEmail: string, password?: string): Promise<{ error?: string }> => {
    const term = usernameOrEmail.trim().toLowerCase();
    const pass = password || '';

    // Match by username 'admin' or email 'admin@chromadiaries.in'
    const account = profiles.find((p) => {
      const emailMatch = p.email.toLowerCase() === term;
      const usernameMatch = p.full_name.toLowerCase() === term || (term === 'admin' && p.system_role === 'owner');
      return emailMatch || usernameMatch;
    });

    if (!account) {
      return { error: 'Account not found. Please verify your username/email.' };
    }

    if (account.is_active === false) {
      return { error: 'This account has been deactivated by the administrator. Please contact your workspace owner.' };
    }

    // Verify password
    const expectedPassword = account.password || 'admin@123';
    if (pass !== expectedPassword) {
      return { error: 'Incorrect password. Default owner password is admin@123' };
    }

    const { password: _, ...safeUser } = account;
    setCurrentUser(safeUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(safeUser));
    }

    router.push('/');
    return {};
  };

  const logout = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_USER);
      } catch {}
    }
    router.replace('/login');
  };

  // Owner or Department Admin creates new account
  const createAccount = async (data: {
    full_name: string;
    email: string;
    role: SystemRole;
    department_id?: string;
    password?: string;
    avatar_url?: string;
  }): Promise<{ error?: string; user?: Profile }> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = profiles.find((p) => p.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { error: 'An account with this email already exists.' };
    }

    // Role Enforcement: Department Admin can only create members for their own department (SYS-005, SYS-006)
    const isAdmin = currentUser?.system_role === 'admin';
    const effectiveRole: SystemRole = isAdmin ? 'member' : data.role;
    const effectiveDeptId = effectiveRole === 'general_member' 
      ? null 
      : isAdmin 
      ? currentUser?.department_id 
      : (data.department_id || null);

    const generatedUserId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'b0000000-0000-0000-0000-' + Math.floor(100000000000 + Math.random() * 900000000000).toString(16).padStart(12, '0');

    const newAccount: UserAccount = {
      id: generatedUserId,
      email: cleanEmail,
      full_name: data.full_name.trim(),
      system_role: effectiveRole,
      password: data.password || 'member@123',
      department_id: effectiveDeptId,
      avatar_url: data.avatar_url && data.avatar_url.trim() ? data.avatar_url.trim() : '/profile-icon.png',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = [...profiles, newAccount];
    setProfiles(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(updated));
    }

    // Sync to Supabase if configured
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('profiles').insert([{
          id: newAccount.id,
          email: newAccount.email,
          full_name: newAccount.full_name,
          avatar_url: newAccount.avatar_url,
          system_role: newAccount.system_role,
        }]).then();

        if (effectiveDeptId) {
          supabase.from('department_members').insert([{
            department_id: effectiveDeptId,
            user_id: newAccount.id,
            role: effectiveRole === 'admin' ? 'admin' : 'member',
          }]).then();
        }
      }
    }

    const { password: _, ...safeUser } = newAccount;
    return { user: safeUser };
  };

  // Update profile data: Username, Gmail/Email, Phone, Bio, Password, Avatar, Role, Department
  const updateAccount = async (
    userId: string,
    data: {
      full_name?: string;
      email?: string;
      phone?: string;
      bio?: string;
      password?: string;
      avatar_url?: string;
      system_role?: SystemRole;
      department_id?: string | null;
      is_active?: boolean;
    }
  ): Promise<{ error?: string; user?: Profile }> => {
    let updatedAcc: UserAccount | null = null;
    const updatedProfiles = profiles.map((p) => {
      if (p.id === userId) {
        updatedAcc = {
          ...p,
          ...(data.full_name !== undefined ? { full_name: data.full_name.trim() } : {}),
          ...(data.email !== undefined ? { email: data.email.trim().toLowerCase() } : {}),
          ...(data.phone !== undefined ? { phone: data.phone.trim() } : {}),
          ...(data.bio !== undefined ? { bio: data.bio.trim() } : {}),
          ...(data.password !== undefined && data.password.trim() ? { password: data.password.trim() } : {}),
          ...(data.avatar_url !== undefined ? { avatar_url: data.avatar_url } : {}),
          ...(data.system_role !== undefined ? { system_role: data.system_role } : {}),
          ...(data.department_id !== undefined ? { department_id: data.department_id } : {}),
          ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
          updated_at: new Date().toISOString(),
        };
        return updatedAcc;
      }
      return p;
    });

    if (!updatedAcc) {
      return { error: 'Account not found.' };
    }

    setProfiles(updatedProfiles);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(updatedProfiles));
    }

    // If current logged-in user is updated, update active session
    if (currentUser?.id === userId) {
      const { password: _, ...safeUser } = updatedAcc as UserAccount;
      setCurrentUser(safeUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(safeUser));
      }
    }

    // Sync updates to Supabase if configured
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase
          .from('profiles')
          .update({
            full_name: (updatedAcc as UserAccount).full_name,
            email: (updatedAcc as UserAccount).email,
            phone: (updatedAcc as UserAccount).phone,
            bio: (updatedAcc as UserAccount).bio,
            avatar_url: (updatedAcc as UserAccount).avatar_url,
            system_role: (updatedAcc as UserAccount).system_role,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .then();
      }
    }

    const { password: _, ...safeUser } = updatedAcc as UserAccount;
    return { user: safeUser };
  };

  const deleteAccount = async (userId: string): Promise<{ error?: string; success?: boolean }> => {
    const target = profiles.find((p) => p.id === userId);
    if (!target) {
      return { error: 'Account not found.' };
    }
    if (target.system_role === 'owner') {
      return { error: 'The primary workspace Owner account cannot be deleted.' };
    }

    const updated = profiles.filter((p) => p.id !== userId);
    setProfiles(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(updated));
    }

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('profiles').delete().eq('id', userId).then();
      }
    }

    return { success: true };
  };

  const toggleUserActive = async (userId: string): Promise<boolean> => {
    const acc = profiles.find((p) => p.id === userId);
    if (!acc) return false;
    const nextState = acc.is_active === false ? true : false;
    await updateAccount(userId, { is_active: nextState });
    return true;
  };

  const getAccountPassword = (userId: string): string => {
    const acc = profiles.find((p) => p.id === userId);
    return acc?.password || 'admin@123';
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        role: currentUser?.system_role || 'member',
        isLiveSupabase: isSupabaseConfigured(),
        allProfiles: profiles.map(({ password: _, ...p }) => p),
        login,
        logout,
        createAccount,
        updateAccount,
        deleteAccount,
        toggleUserActive,
        getAccountPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
