'use client'
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';

export type UserRole = 'Jefe Operativo' | 'Administrador' | 'Directorio' | 'Propietario' | 'Arrendatario';

interface User {
  documentId: string | undefined;
  id: string;
  username: string;
  email: string;
  perfil_operacional?: {
    documentId: string;
    rol: 'Jefe Operativo' | 'Administrador' | 'Directorio';
    proyectosAsignados: {
      documentId: string;
      nombre: string;
    }[];
  };
  perfil_cliente?: {
    id: number;
    documentId: string;
    rol: 'Propietario' | 'Arrendatario';
    tipoPersona: 'Natural' | 'Juridica';
    esEmpresaRepresentante: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Definición de permisos por rol
const rolePermissions: Record<UserRole, string[]> = {
  'Jefe Operativo': ['view_basic', 'manage_properties', 'manage_documents'],
  'Administrador': ['view_basic', 'manage_properties', 'manage_documents', 'manage_users', 'view_finances'],
  'Directorio': ['view_basic', 'manage_properties', 'manage_documents', 'manage_users', 'view_finances', 'manage_company'],
  'Propietario': ['view_own_properties', 'view_own_documents'],
  'Arrendatario': ['view_rented_property', 'view_own_documents']
};

const ME_QUERY = gql`
  query GetMe {
    me {
      id
      username
      email
      perfil_operacional {
        id
        documentId
        rol
        proyectosAsignados {
          documentId
          nombre
        }
      }
      perfil_cliente {
        id
        documentId
        rol
        tipoPersona
        esEmpresaRepresentante
      }
    }
  }
`;

const LOGIN_MUTATION = gql`
  mutation Login($input: UsersPermissionsLoginInput!) {
    login(input: $input) {
      jwt
      user {
        id
        username
        email
        perfil_operacional {
          id
          rol
        }
        perfil_cliente {
          id
          rol
          tipoPersona
          esEmpresaRepresentante
        }
      }
    }
  }
`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Verificar el token y obtener datos del usuario al cargar
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('jwt');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const userResponse = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/users/me?populate[0]=perfil_operacional&populate[1]=perfil_cliente&populate[2]=perfil_operacional.proyectosAsignados`, 
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!userResponse.ok) {
          throw new Error('Error al verificar el token');
        }

        const userData = await userResponse.json();
        console.log('User data from /me:', userData);

        setUser(userData);
        
        // Determinar el rol
        const userRole = userData.perfil_operacional?.rol || userData.perfil_cliente?.rol;
        console.log('Perfil Operacional:', userData.perfil_operacional);
        console.log('Perfil Cliente:', userData.perfil_cliente);
        console.log('Role detected:', userRole);

        if (userRole) {
          console.log('Setting role to:', userRole);
          setRole(userRole as UserRole);
        } else {
          console.log('No role found. User needs to be assigned a profile.');
          router.push('/no-profile');
        }
      } catch (error) {
        console.error('Error al verificar la autenticación:', error);
        localStorage.removeItem('jwt');
        setUser(null);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const login = async (email: string, password: string) => {
    try {
      console.log('Iniciando login para:', email);
      const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/auth/local`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: email,
          password,
        }),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (data.jwt) {
        localStorage.setItem('jwt', data.jwt);
        
        // Obtener los datos completos del usuario incluyendo los perfiles
        const profileResponse = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/users/me?populate[0]=perfil_operacional&populate[1]=perfil_cliente&populate[2]=perfil_operacional.proyectosAsignados`,
          {
            headers: {
              Authorization: `Bearer ${data.jwt}`,
            },
          }
        );

        const userData = await profileResponse.json();
        console.log('User data with profiles:', userData);
        setUser(userData);
        
        // Determinar el rol
        const userRole = userData.perfil_operacional?.rol || userData.perfil_cliente?.rol;
        console.log('Perfil Operacional:', userData.perfil_operacional);
        console.log('Perfil Cliente:', userData.perfil_cliente);
        console.log('Role detected:', userRole);

        if (userRole) {
          console.log('Setting role to:', userRole);
          setRole(userRole as UserRole);
          router.push('/dashboard');
        } else {
          console.log('No role found. User needs to be assigned a profile.');
          router.push('/no-profile');
        }
      } else {
        throw new Error(data.error?.message || 'Error al iniciar sesión');
      }
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('jwt');
    setUser(null);
    setRole(null);
    router.push('/login');
  };

  const hasPermission = (permission: string) => {
    if (!role) return false;
    return rolePermissions[role]?.includes(permission) || false;
  };

  return (
    <AuthContext.Provider value={{ user, role, isLoading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 