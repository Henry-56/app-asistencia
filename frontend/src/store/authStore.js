import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/axios';

export const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            loading: false,

            login: async (loginCode) => {
                set({ loading: true });
                try {
                    const { data } = await api.post('/auth/login', { login_code: loginCode });

                    // Token ahora viene en httpOnly cookie, no en response body
                    set({ user: data.user, loading: false });

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
                // Limpiar estado y redirigir (cookie se limpiará automáticamente al expirar)
                set({ user: null });
                window.location.href = '/';
            },

            fetchMe: async () => {
                set({ loading: true });
                try {
                    const { data } = await api.get('/auth/me');
                    set({ user: data.user, loading: false });
                } catch (error) {
                    console.error('FetchMe Error:', error);
                    set({ user: null, loading: false });
                }
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ user: state.user }),
        }
    )
);
