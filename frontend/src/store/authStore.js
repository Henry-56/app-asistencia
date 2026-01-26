import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/axios';

export const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            token: null,
            loading: false,

            login: async (loginCode) => {
                set({ loading: true });
                try {
                    const { data } = await api.post('/auth/login', { login_code: loginCode });

                    localStorage.setItem('auth_token', data.token);
                    set({ user: data.user, token: data.token, loading: false });

                    return data.user;
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            register: async (userData) => {
                const { data } = await api.post('/auth/register', userData);
                return data.data;
            },

            logout: () => {
                localStorage.removeItem('auth_token');
                set({ user: null, token: null });
                window.location.href = '/';
            },

            fetchMe: async () => {
                set({ loading: true });
                try {
                    const { data } = await api.get('/auth/me');
                    set({ user: data.user, loading: false });
                } catch (error) {
                    console.error('FetchMe Error:', error);
                    set({ user: null, token: null, loading: false });
                    localStorage.removeItem('auth_token');
                }
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ user: state.user, token: state.token }),
        }
    )
);
