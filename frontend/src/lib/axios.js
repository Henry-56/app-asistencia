import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
    withCredentials: true, // Enviar cookies automáticamente (httpOnly cookies)
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token inválido o expirado - limpiar storage de Zustand
            localStorage.removeItem('auth-storage');
            // Opcionalmente redirigir al login
            // window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default api;
