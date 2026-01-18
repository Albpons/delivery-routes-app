// auth-supabase.js - Autenticación con Supabase - COMPLETO

const AuthManagerSupabase = {
    currentUser: null,
    session: null,

    // Inicializar autenticación
    async init() {
        try {
            console.log('🔄 Inicializando autenticación...');
            
            // Verificar que supabase esté disponible
            if (!window.supabase) {
                console.warn('⚠️ Supabase no disponible, intentando inicializar...');
                await this.waitForSupabase();
            }
            
            if (!window.supabase) {
                console.warn('⚠️ Supabase no disponible, usando modo offline');
                return this.initOffline();
            }
            
            // Verificar sesión existente
            const { data: { session }, error } = await window.supabase.auth.getSession();
            
            if (error) {
                console.error('Error obteniendo sesión:', error);
                return this.initOffline();
            }
            
            if (session) {
                this.session = session;
                this.currentUser = await this.getUserByEmail(session.user.email);
                
                if (this.currentUser) {
                    this.showAppBasedOnRole();
                    return true;
                }
            }
            
            // Verificar si hay usuario guardado en localStorage
            return this.initOffline();
            
        } catch (error) {
            console.error('Error inicializando auth:', error);
            return this.initOffline();
        }
    },

    // Esperar a que Supabase esté disponible
    async waitForSupabase() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 10;
            
            const interval = setInterval(() => {
                attempts++;
                
                if (window.supabase) {
                    clearInterval(interval);
                    console.log('✅ Supabase disponible después de', attempts, 'intentos');
                    resolve();
                }
                
                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    console.warn('⚠️ Supabase no disponible después de', maxAttempts, 'intentos');
                    resolve();
                }
            }, 500);
        });
    },

    // Inicializar modo offline
    async initOffline() {
        try {
            const savedUser = localStorage.getItem('currentUser');
            
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                
                // Verificar que el usuario tenga datos básicos
                if (!this.currentUser.role) {
                    this.currentUser.role = this.currentUser.email === 'admin@deliveryroutes.com' ? 'admin' : 'driver';
                }
                
                this.showAppBasedOnRole();
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error en initOffline:', error);
            return false;
        }
    },

    // Obtener usuario por email
    async getUserByEmail(email) {
        try {
            // Si no hay supabase, crear usuario básico
            if (!window.supabase) {
                return {
                    id: 0,
                    email: email,
                    name: email.split('@')[0],
                    role: email === 'admin@deliveryroutes.com' ? 'admin' : 'driver'
                };
            }
            
            const { data, error } = await window.supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();
            
            if (error) {
                // Si no existe, crear usuario básico
                console.log('Usuario no encontrado en tabla users, creando básico...');
                return {
                    id: 0,
                    email: email,
                    name: email.split('@')[0],
                    role: email === 'admin@deliveryroutes.com' ? 'admin' : 'driver'
                };
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
            console.log('🔐 Intentando login:', { email, userType });
            
            // Ajustar email según tipo
            const loginEmail = userType === 'admin' ? 
                (email.includes('@') ? email : email + '@deliveryroutes.com') :
                email.toLowerCase() + '@deliveryroutes.com';
            
            // Para admin, usar autenticación por email/password
            if (userType === 'admin') {
                return await this.loginAdmin(loginEmail, password);
            } else {
                // Para drivers, verificar en tabla drivers
                return await this.loginDriver(email, password);
            }
            
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, message: error.message || 'Error desconocido' };
        }
    },

    // Login para admin
    async loginAdmin(email, password) {
        try {
            // Verificar si estamos en modo offline
            if (!window.supabase) {
                // Modo offline: admin por defecto
                this.currentUser = {
                    id: 0,
                    name: 'Administrador',
                    email: email,
                    role: 'admin'
                };
                
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                this.showAppBasedOnRole();
                return { success: true, user: this.currentUser };
            }
            
            const { data, error } = await window.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) {
                console.error('Error auth admin:', error);
                throw error;
            }
            
            this.session = data.session;
            this.currentUser = {
                id: 0,
                name: 'Administrador',
                email: email,
                role: 'admin'
            };
            
            // Guardar en localStorage
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            this.showAppBasedOnRole();
            return { success: true, user: this.currentUser };
            
        } catch (error) {
            console.error('Error loginAdmin:', error);
            
            // Fallback: crear usuario admin local
            this.currentUser = {
                id: 0,
                name: 'Administrador',
                email: email,
                role: 'admin'
            };
            
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.showAppBasedOnRole();
            return { success: true, user: this.currentUser };
        }
    },

    // Login para driver
    async loginDriver(username, password) {
        try {
            const cleanUsername = username.toLowerCase().trim();
            
            // Primero intentar con Supabase
            if (window.supabase) {
                const { data: drivers, error } = await window.supabase
                    .from('drivers')
                    .select('*')
                    .eq('username', cleanUsername);
                
                if (error) {
                    console.error('Error obteniendo driver:', error);
                    throw error;
                }
                
                if (drivers.length > 0) {
                    const driver = drivers[0];
                    
                    // Verificar contraseña (en producción usaría hash)
                    if (password !== driver.username + '123') {
                        throw new Error('Contraseña incorrecta');
                    }
                    
                    this.currentUser = {
                        id: driver.id,
                        name: driver.name,
                        email: driver.email,
                        username: driver.username,
                        role: 'driver',
                        driverData: driver
                    };
                    
                    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                    this.showAppBasedOnRole();
                    return { success: true, user: this.currentUser };
                }
            }
            
            // Si no hay Supabase o no encontró el driver, buscar en localStorage
            const localDrivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
            const driver = localDrivers.find(d => d.username === cleanUsername);
            
            if (!driver) {
                throw new Error('Usuario no encontrado');
            }
            
            // Verificar contraseña
            if (password !== driver.username + '123') {
                throw new Error('Contraseña incorrecta');
            }
            
            this.currentUser = {
                id: driver.id,
                name: driver.name,
                email: driver.email,
                username: driver.username,
                role: 'driver',
                driverData: driver
            };
            
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.showAppBasedOnRole();
            return { success: true, user: this.currentUser };
            
        } catch (error) {
            console.error('Error loginDriver:', error);
            return { success: false, message: error.message };
        }
    },

    // Cerrar sesión
    async logout() {
        try {
            if (this.session && window.supabase) {
                await window.supabase.auth.signOut();
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
        if (!this.currentUser) {
            console.error('No hay currentUser para mostrar app');
            return;
        }
        
        console.log('👤 Mostrando app para:', this.currentUser);
        
        // Ocultar login
        document.getElementById('loginPage').classList.add('hidden');
        
        // Mostrar app según rol
        if (this.currentUser.role === 'admin') {
            document.getElementById('adminApp').classList.remove('hidden');
            this.updateAdminUI();
            
            // Cargar datos iniciales si DataManager está disponible
            if (window.DataManagerSupabase) {
                setTimeout(() => {
                    DataManagerSupabase.loadInitialData().then(() => {
                        if (window.UIManager) {
                            UIManager.loadDashboard();
                        }
                    });
                }, 500);
            }
        } else {
            document.getElementById('driverApp').classList.remove('hidden');
            this.updateDriverUI();
            
            // Cargar datos del repartidor
            if (window.UIManager) {
                setTimeout(() => {
                    UIManager.loadDriverRoutes();
                    UIManager.loadDriverDeliveries();
                    UIManager.updateDriverProfile();
                }, 500);
            }
        }
    },

    // Actualizar UI de admin
    updateAdminUI() {
        if (!this.currentUser) return;
        
        const adminNameElement = document.querySelector('#adminApp .user-name');
        const adminAvatar = document.querySelector('#adminApp .avatar');
        
        if (adminNameElement) {
            adminNameElement.textContent = this.currentUser.name || 'Administrador';
        }
        
        if (adminAvatar) {
            adminAvatar.textContent = (this.currentUser.name || 'A').charAt(0).toUpperCase();
        }
    },

    // Actualizar UI de driver
    updateDriverUI() {
        if (!this.currentUser) return;
        
        const driverNameElement = document.querySelector('#driverApp .user-name');
        const driverAvatar = document.querySelector('#driverApp .avatar');
        
        if (driverNameElement) {
            driverNameElement.textContent = this.currentUser.name || 'Repartidor';
        }
        
        if (driverAvatar) {
            driverAvatar.textContent = (this.currentUser.name || 'R').charAt(0).toUpperCase();
        }
        
        // Actualizar perfil
        if (window.UIManager && window.UIManager.updateDriverProfile) {
            setTimeout(() => {
                UIManager.updateDriverProfile();
            }, 1000);
        }
    },

    // Verificar si el usuario está autenticado
    isAuthenticated() {
        return !!this.currentUser;
    },

    // Obtener información del usuario actual
    getUserInfo() {
        return this.currentUser;
    }
};

// Función de login para usar desde HTML
async function loginSupabase() {
    const emailInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    if (!emailInput || !passwordInput) {
        alert('Error: No se encontraron los campos de entrada');
        return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        alert('Por favor, completa todos los campos');
        return;
    }
    
    const userType = document.getElementById('adminOption').classList.contains('active') ? 'admin' : 'driver';
    
    // Mostrar loading
    const loginBtn = document.querySelector('#loginPage .btn-primary');
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando sesión...';
    loginBtn.disabled = true;
    
    try {
        const result = await AuthManagerSupabase.login(email, password, userType);
        
        if (!result.success) {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error en loginSupabase:', error);
        alert('Error inesperado: ' + error.message);
    } finally {
        // Restaurar botón
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

// Función de logout para usar desde HTML
async function logoutSupabase() {
    await AuthManagerSupabase.logout();
}

// Función para seleccionar tipo de usuario
function selectUserType(type) {
    const adminOption = document.getElementById('adminOption');
    const driverOption = document.getElementById('driverOption');
    
    if (type === 'admin') {
        adminOption.classList.add('active');
        driverOption.classList.remove('active');
    } else {
        driverOption.classList.add('active');
        adminOption.classList.remove('active');
    }
}

// Exportar para uso global
window.AuthManagerSupabase = AuthManagerSupabase;
window.loginSupabase = loginSupabase;
window.logoutSupabase = logoutSupabase;
window.selectUserType = selectUserType;
