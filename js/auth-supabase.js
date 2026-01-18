// auth-supabase.js - AUTENTICACIÓN SIMPLIFICADA
const AuthManagerSupabase = {
    currentUser: null,

    // Inicializar: verificar sesión guardada
    async init() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showAppBasedOnRole();
            return true;
        }
        return false;
    },

    // Login simplificado
    async login(email, password, userType) {
        console.log('🔐 Login intent:', { email, password, userType });
        
        if (userType === 'admin') {
            // ADMIN: usuario simple
            if (email === 'admin' || email === 'admin@deliveryroutes.com') {
                this.currentUser = {
                    id: 1,
                    name: 'Administrador',
                    email: 'admin@deliveryroutes.com',
                    role: 'admin'
                };
            } else {
                alert('❌ Usuario admin no válido. Usa: admin');
                return { success: false };
            }
        } else {
            // REPARTIDOR: verificar en tabla drivers
            try {
                const { data: drivers, error } = await supabase
                    .from('drivers')
                    .select('*')
                    .eq('username', email.toLowerCase());
                
                if (error || !drivers || drivers.length === 0) {
                    alert('❌ Repartidor no encontrado');
                    return { success: false };
                }
                
                const driver = drivers[0];
                
                // Contraseña: nombre + "123"
                const expectedPassword = driver.username + '123';
                if (password !== expectedPassword) {
                    alert('❌ Contraseña incorrecta. Usa: ' + expectedPassword);
                    return { success: false };
                }
                
                this.currentUser = {
                    id: driver.id,
                    name: driver.name,
                    email: driver.email,
                    role: 'driver',
                    driverData: driver
                };
                
            } catch (error) {
                console.error('Error login driver:', error);
                alert('❌ Error de conexión. Usando datos locales.');
                
                // Fallback: datos de ejemplo
                const sampleDrivers = [
                    { id: 1, name: 'Rosa', username: 'rosa', email: 'rosa@deliveryroutes.com' },
                    { id: 2, name: 'Sonia', username: 'sonia', email: 'sonia@deliveryroutes.com' },
                    { id: 3, name: 'Nuria', username: 'nuria', email: 'nuria@deliveryroutes.com' },
                    { id: 4, name: 'Santi', username: 'santi', email: 'santi@deliveryroutes.com' },
                    { id: 5, name: 'Albert', username: 'albert', email: 'albert@deliveryroutes.com' }
                ];
                
                const driver = sampleDrivers.find(d => d.username === email.toLowerCase());
                if (driver) {
                    this.currentUser = {
                        id: driver.id,
                        name: driver.name,
                        email: driver.email,
                        role: 'driver'
                    };
                } else {
                    return { success: false };
                }
            }
        }
        
        // Guardar sesión
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        // Mostrar aplicación
        this.showAppBasedOnRole();
        return { success: true };
    },

    // Mostrar app según rol
    showAppBasedOnRole() {
        if (!this.currentUser) return;
        
        document.getElementById('loginPage').classList.add('hidden');
        
        if (this.currentUser.role === 'admin') {
            document.getElementById('adminApp').classList.remove('hidden');
            this.updateAdminUI();
            
            // Cargar datos
            if (typeof DataManagerSupabase !== 'undefined') {
                DataManagerSupabase.loadInitialData();
            }
        } else {
            document.getElementById('driverApp').classList.remove('hidden');
            this.updateDriverUI();
            
            // Cargar datos del repartidor
            if (typeof UIManager !== 'undefined') {
                UIManager.loadDriverRoutes();
                UIManager.loadDriverDeliveries();
            }
        }
    },

    // Actualizar UI (igual que antes)
    updateAdminUI() {
        if (!this.currentUser) return;
        const adminNameElement = document.querySelector('#adminApp .user-name');
        const adminAvatar = document.querySelector('#adminApp .avatar');
        if (adminNameElement) adminNameElement.textContent = this.currentUser.name;
        if (adminAvatar) adminAvatar.textContent = this.currentUser.name.charAt(0);
    },

    updateDriverUI() {
        if (!this.currentUser) return;
        const driverNameElement = document.querySelector('#driverApp .user-name');
        const driverAvatar = document.querySelector('#driverApp .avatar');
        if (driverNameElement) driverNameElement.textContent = this.currentUser.name;
        if (driverAvatar) driverAvatar.textContent = this.currentUser.name.charAt(0);
    },

    // Logout
    async logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        document.getElementById('loginPage').classList.remove('hidden');
        document.getElementById('adminApp').classList.add('hidden');
        document.getElementById('driverApp').classList.add('hidden');
        return { success: true };
    }
};

// Función global para login
async function loginSupabase() {
    const email = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const userType = document.getElementById('adminOption').classList.contains('active') ? 'admin' : 'driver';
    
    await AuthManagerSupabase.login(email, password, userType);
}

// Función global para logout
async function logoutSupabase() {
    await AuthManagerSupabase.logout();
}

// Exportar
window.AuthManagerSupabase = AuthManagerSupabase;
window.loginSupabase = loginSupabase;
window.logoutSupabase = logoutSupabase;
