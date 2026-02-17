// src/app/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { toast } from 'sonner';

export interface User {
  id: string;
  nutriologoId?: string;
  adminId?: string;
  email: string;
  nombre: string;
  apellido: string;
  nombreUsuario: string;
  celular: string;
  rol: 'admin' | 'nutriologo';
  tarifa?: number;
  descripcion?: string;
  fotoPerfil?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  loading: boolean;
}

// ¡Export nombrado aquí!
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isInitialized) return;
    setIsInitialized(true);

    const cached = localStorage.getItem('nutriu_user');
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as User;
        setUser(parsed);
        console.log('[Auth] Restaurado desde caché → rol:', parsed.rol);
      } catch (e) {
        console.warn('[Auth] Caché corrupto, eliminando...');
        localStorage.removeItem('nutriu_user');
      }
    }

    const initializeAuth = async () => {
      console.log('[Auth] Inicializando autenticación...');
      setLoading(true);

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          console.log('[Auth] Sesión activa detectada, cargando perfil...');
          await fetchUserData(session.user.id);
        } else {
          console.log('[Auth] No hay sesión activa');
          setUser(null);
          localStorage.removeItem('nutriu_user');
        }
      } catch (err: any) {
        console.error('[Auth] Error al inicializar:', err.message);
        setUser(null);
        localStorage.removeItem('nutriu_user');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Cambio de estado detectado:', event);

      if (event === 'SIGNED_IN' && session?.user) {
        await fetchUserData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('nutriu_user');
      } else if (event === 'PASSWORD_RECOVERY') {
        console.log('[Auth] Modo recuperación de contraseña activado');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [isInitialized]);

  const fetchUserData = async (userId: string) => {
    console.log('[fetchUserData] Cargando perfil para UID:', userId);

    try {
      const { data: adminData, error: adminError } = await supabase
        .from('administradores')
        .select('id_admin, nombre, apellido, correo, numero_celular')
        .eq('id_auth_user', userId)
        .maybeSingle();

      if (adminError) throw adminError;

      if (adminData) {
        const newUser: User = {
          id: userId,
          adminId: adminData.id_admin.toString(),
          email: adminData.correo || '',
          nombre: adminData.nombre || '',
          apellido: adminData.apellido || '',
          nombreUsuario: '',
          celular: adminData.numero_celular || '',
          rol: 'admin',
        };
        setUser(newUser);
        localStorage.setItem('nutriu_user', JSON.stringify(newUser));
        console.log('[fetchUserData] Administrador encontrado');
        return;
      }

      const { data: nutriData, error: nutriError } = await supabase
        .from('nutriologos')
        .select('id_nutriologo, nombre, apellido, correo, numero_celular, tarifa_consulta, nombre_usuario, descripcion, foto_perfil')
        .eq('id_auth_user', userId)
        .maybeSingle();

      if (nutriError) throw nutriError;

      if (nutriData) {
        const newUser: User = {
          id: userId,
          nutriologoId: nutriData.id_nutriologo.toString(),
          email: nutriData.correo || '',
          nombre: nutriData.nombre || '',
          apellido: nutriData.apellido || '',
          nombreUsuario: nutriData.nombre_usuario || '',
          celular: nutriData.numero_celular || '',
          rol: 'nutriologo',
          tarifa: nutriData.tarifa_consulta,
          descripcion: nutriData.descripcion || '',
          fotoPerfil: nutriData.foto_perfil || null,
        };
        setUser(newUser);
        localStorage.setItem('nutriu_user', JSON.stringify(newUser));
        console.log('[fetchUserData] Nutriólogo encontrado');
        return;
      }

      console.warn('[fetchUserData] No se encontró perfil asociado');
      toast.warning('No se encontró perfil asociado a esta cuenta');
      setUser(null);
      localStorage.removeItem('nutriu_user');
    } catch (error: any) {
      console.error('[fetchUserData] Error:', error.message);
      toast.error('Error al cargar el perfil: ' + (error.message || 'Intenta nuevamente'));
      setUser(null);
      localStorage.removeItem('nutriu_user');
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        await fetchUserData(data.user.id);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('[login] Error:', error.message);
      toast.error('Error al iniciar sesión: ' + (error.message || 'Credenciales inválidas'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem('nutriu_user');
      toast.success('Sesión cerrada correctamente');
    } catch (error: any) {
      console.error('[logout] Error:', error.message);
      toast.error('Error al cerrar sesión');
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) {
      toast.error('No hay sesión activa');
      return;
    }

    const table = user.rol === 'admin' ? 'administradores' : 'nutriologos';
    const updateData: any = {};

    if (data.nombre) updateData.nombre = data.nombre;
    if (data.apellido) updateData.apellido = data.apellido;
    if (data.celular) updateData.numero_celular = data.celular;

    if (user.rol === 'nutriologo') {
      if (data.tarifa !== undefined) updateData.tarifa_consulta = data.tarifa;
      if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;
      if (data.fotoPerfil !== undefined) updateData.foto_perfil = data.fotoPerfil;
      if (data.nombreUsuario !== undefined) updateData.nombre_usuario = data.nombreUsuario;
    }

    if (Object.keys(updateData).length === 0) return;

    try {
      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id_auth_user', user.id);

      if (error) throw error;

      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('nutriu_user', JSON.stringify(updatedUser));
      toast.success('Perfil actualizado correctamente');
    } catch (error: any) {
      console.error('[updateProfile] Error:', error.message);
      toast.error('No se pudo actualizar el perfil: ' + (error.message || 'Intenta de nuevo'));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}