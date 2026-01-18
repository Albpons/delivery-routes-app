// auth-supabase.js - Autenticación con Supabase
const AuthManagerSupabase = {
    currentUser: null,
    session: null,

    // Inicializar autenticación
    async init() {
        try {
            // Verificar sesión existente
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) throw error;
            
            if (session) {
                this.session = session;
                this.currentUser = await this.getUserByEmail(session.user.email);
                
                if (this.currentUser) {
                    this.showAppBasedOnRole();
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error inicializando auth:', error);
            return false;
        }
    },

    // Obtener usuario por email
    async getUserByEmail(email) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();
            
            if (error) {
                // Si no existe, buscar en drivers
                const { data: driver } = await supabase
                    .from('drivers')
                    .select('*')
                    .eq('email', email)
                    .single();
                
                if (driver) {
                    return {
                        id: driver.id,
                        name: driver.name,
                        email: driver.email,
                        role: 'driver',
                        driverData: driver
                    };
                }
                return null;
            }
            
            return data;
        } catch (error) {
            console.error('Error obteniendo usuario:', error);
            return null;
        }
    },

    // Iniciar sesión
    async login(email, password, userType) {
        try {
            // Para admin, usar autenticación por email/password
            if (userType === 'admin') {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (error) throw error;
                
                this.session = data.session;
                this.currentUser = {
                    id: 0,
                    name: 'Administrador',
                    email: email,
                    role: 'admin'
                };
                
            } else {
                // Para drivers, verificar en tabla drivers
                const { data: drivers, error } = await supabase
                    .from('drivers')
                    .select('*')
                    .eq('username', email.toLowerCase());
                
                if (error) throw error;
                
                if (drivers.length === 0) {
                    throw new Error('Usuario no encontrado');
                }
                
                const driver = drivers[0];
                // Verificar contraseña (en producción usaría hash)
                if (password !== driver.username + '123') {
                    throw new Error('Contraseña incorrecta');
                }
                
                this.currentUser = {
                    id: driver.id,
                    name: driver.name,
                    email: driver.email,
                    role: 'driver',
                    driverData: driver
                };
            }
            
            // Guardar sesión en localStorage
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            this.showAppBasedOnRole();
            return { success: true, user: this.currentUser };
            
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, message: error.message };
        }
    },

    // Cerrar sesión
    async logout() {
        try {
            if (this.session) {
                await supabase.auth.signOut();
            }
            
            this.currentUser = null;
            this.session = null;
            localStorage.removeItem('currentUser');
            
            // Mostrar login
            document.getElementById('loginPage').classList.remove('hidden');
            document.getElementById('adminApp').classList.add('hidden');
            document.getElementById('driverApp').classList.add('hidden');
            
            return { success: true };
        } catch (error) {
            console.error('Error en logout:', error);
            return { success: false, message: error.message };
        }
    },

    // Mostrar app según rol
    showAppBasedOnRole() {
        if (!this.currentUser) return;
        
        document.getElementById('loginPage').classList.add('hidden');
        
        if (this.currentUser.role === 'admin') {
            document.getElementById('adminApp').classList.remove('hidden');
            this.updateAdminUI();
            // Cargar datos iniciales
            DataManagerSupabase.loadInitialData();
        } else {
            document.getElementById('driverApp').classList.remove('hidden');
            this.updateDriverUI();
            // Cargar datos del repartidor
            UIManager.loadDriverRoutes();
            UIManager.loadDriverDeliveries();
        }
    },

    // Actualizar UI de admin
    updateAdminUI() {
        if (!this.currentUser) return;
        
        const adminNameElement = document.querySelector('#adminApp .user-name');
        const adminAvatar = document.querySelector('#adminApp .avatar');
        
        if (adminNameElement) {
            adminNameElement.textContent = this.currentUser.name;
        }
        
        if (adminAvatar) {
            adminAvatar.textContent = this.currentUser.name.charAt(0);
        }
    },

    // Actualizar UI de driver
    updateDriverUI() {
        if (!this.currentUser) return;
        
        const driverNameElement = document.querySelector('#driverApp .user-name');
        const driverAvatar = document.querySelector('#driverApp .avatar');
        
        if (driverNameElement) {
            driverNameElement.textContent = this.currentUser.name;
        }
        
        if (driverAvatar) {
            driverAvatar.textContent = this.currentUser.name.charAt(0);
        }
        
        // Actualizar perfil
        UIManager.updateDriverProfile();
    }
};

// Función de login para usar desde HTML
async function loginSupabase() {
    const email = document.getElementById('username').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const userType = document.getElementById('adminOption').classList.contains('active') ? 'admin' : 'driver';
    
    // Ajustar email según tipo
    const loginEmail = userType === 'admin' ? email : email + '@deliveryroutes.com';
    
    const result = await AuthManagerSupabase.login(loginEmail, password, userType);
    
    if (!result.success) {
        alert('Error: ' + result.message);
    }
}

// Función de logout para usar desde HTML
async function logoutSupabase() {
    await AuthManagerSupabase.logout();
}

// Exportar
window.AuthManagerSupabase = AuthManagerSupabase;
window.loginSupabase = loginSupabase;
window.logoutSupabase = logoutSupabase;
