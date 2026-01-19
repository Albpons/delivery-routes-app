// Gestión de autenticación
const AuthManager = {
    currentUser: null,
    isAuthenticated: false,
    userRole: null,
    
    // Inicializar autenticación
    async init() {
        try {
            // Verificar si hay sesión guardada
            const savedUser = localStorage.getItem('deliveryApp_user');
            const savedSession = localStorage.getItem('deliveryApp_session');
            
            if (savedUser && savedSession) {
                this.currentUser = JSON.parse(savedUser);
                this.isAuthenticated = true;
                this.userRole = this.currentUser.role;
                
                // Verificar conexión a Supabase
                const connection = await checkSupabaseConnection();
                
                if (connection.online) {
                    // Verificar que el usuario aún existe
                    if (this.currentUser.role === 'admin') {
                        // Verificar admin
                        const { data: admin, error } = await supabase
                            .from(AppConfig.TABLES.USERS)
                            .select('*')
                            .eq('email', this.currentUser.email)
                            .single();
                        
                        if (error || !admin) {
                            this.logout();
                            return false;
                        }
                    } else {
                        // Verificar repartidor
                        const { data: driver, error } = await supabase
                            .from(AppConfig.TABLES.DRIVERS)
                            .select('*')
                            .eq('id', this.currentUser.id)
                            .single();
                        
                        if (error || !driver) {
                            this.logout();
                            return false;
                        }
                    }
                }
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error inicializando autenticación:', error);
            return false;
        }
    },
    
    // Iniciar sesión como administrador
    async loginAsAdmin(email, password) {
        try {
            // En producción, esto usaría autenticación de Supabase
            // Por ahora, usamos un admin por defecto
            if (email === 'admin@delivery.com' && password === 'admin123') {
                this.currentUser = {
                    id: 1,
                    name: 'Administrador',
                    email: email,
                    role: 'admin'
                };
                
                this.isAuthenticated = true;
                this.userRole = 'admin';
                
                // Guardar sesión
                this.saveSession();
                
                // Mostrar aplicación admin
                this.showAdminApp();
                
                return { success: true, user: this.currentUser };
            } else {
                throw new Error('Credenciales incorrectas');
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    },
    
    // Iniciar sesión como repartidor
    async loginAsDriver(driverId, password) {
        try {
            // Obtener repartidor de Supabase
            const { data: drivers, error } = await supabase
                .from(AppConfig.TABLES.DRIVERS)
                .select('*')
                .eq('id', driverId);
            
            if (error) throw error;
            
            if (drivers.length === 0) {
                throw new Error('Repartidor no encontrado');
            }
            
            const driver = drivers[0];
            
            // Verificar contraseña (en producción usaríamos hash)
            if (password !== '123') {
                throw new Error('Contraseña incorrecta');
            }
            
            this.currentUser = {
                id: driver.id,
                name: driver.name,
                email: driver.email || `${driver.username}@empresa.com`,
                username: driver.username,
                vehicle: driver.vehicle,
                role: 'driver',
                driverData: driver
            };
            
            this.isAuthenticated = true;
            this.userRole = 'driver';
            
            // Guardar sesión
            this.saveSession();
            
            // Mostrar aplicación repartidor
            this.showDriverApp();
            
            return { success: true, user: this.currentUser };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },
    
    // Cerrar sesión
    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.userRole = null;
        
        // Limpiar localStorage
        localStorage.removeItem('deliveryApp_user');
        localStorage.removeItem('deliveryApp_session');
        
        // Mostrar pantalla de login
        this.showLogin();
        
        return { success: true };
    },
    
    // Guardar sesión
    saveSession() {
        if (this.currentUser) {
            localStorage.setItem('deliveryApp_user', JSON.stringify(this.currentUser));
            localStorage.setItem('deliveryApp_session', new Date().toISOString());
        }
    },
    
    // Mostrar pantalla de login
    showLogin() {
        document.getElementById('loginPage').classList.remove('hidden');
        document.getElementById('adminApp').classList.add('hidden');
        document.getElementById('driverApp').classList.add('hidden');
    },
    
    // Mostrar aplicación admin
    showAdminApp() {
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('adminApp').classList.remove('hidden');
        document.getElementById('driverApp').classList.add('hidden');
        
        // Actualizar UI
        this.updateAdminUI();
        
        // Cargar datos iniciales
        if (window.DataManager) {
            DataManager.loadInitialData();
        }
    },
    
    // Mostrar aplicación repartidor
    showDriverApp() {
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('adminApp').classList.add('hidden');
        document.getElementById('driverApp').classList.remove('hidden');
        
        // Actualizar UI
        this.updateDriverUI();
        
        // Cargar datos del repartidor
        if (window.DriverManager) {
            DriverManager.loadDriverData();
        }
    },
    
    // Actualizar UI admin
    updateAdminUI() {
        if (!this.currentUser) return;
        
        const adminNameElement = document.getElementById('adminName');
        const adminEmailElement = document.getElementById('adminEmailDisplay');
        
        if (adminNameElement) {
            adminNameElement.textContent = this.currentUser.name;
        }
        
        if (adminEmailElement) {
            adminEmailElement.textContent = this.currentUser.email;
        }
        
        // Actualizar avatar
        const adminAvatar = document.querySelector('#adminApp .avatar');
        if (adminAvatar) {
            adminAvatar.textContent = this.currentUser.name.charAt(0);
        }
    },
    
    // Actualizar UI repartidor
    updateDriverUI() {
        if (!this.currentUser) return;
        
        // Actualizar saludo
        const greeting = this.getGreeting();
        const greetingElement = document.getElementById('driverGreeting');
        if (greetingElement) {
            greetingElement.textContent = greeting + ', ' + this.currentUser.name;
        }
        
        // Actualizar fecha
        this.updateDate();
        
        // Actualizar avatar
        const avatarElements = document.querySelectorAll('#driverApp .avatar, #driverAvatar, #driverProfileAvatar');
        avatarElements.forEach(el => {
            el.textContent = this.currentUser.name.charAt(0);
        });
        
        // Actualizar perfil
        const profileName = document.getElementById('driverProfileName');
        const profileEmail = document.getElementById('driverProfileEmail');
        
        if (profileName) profileName.textContent = this.currentUser.name;
        if (profileEmail) profileEmail.textContent = this.currentUser.email;
    },
    
    // Obtener saludo según hora
    getGreeting() {
        const hour = new Date().getHours();
        
        if (hour < 12) return 'Buenos días';
        if (hour < 19) return 'Buenas tardes';
        return 'Buenas noches';
    },
    
    // Actualizar fecha
    updateDate() {
        const dateElement = document.getElementById('driverDate');
        if (dateElement) {
            const today = new Date();
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            dateElement.textContent = today.toLocaleDateString('es-ES', options);
        }
    },
    
    // Cargar repartidores en select de login
    async loadDriversForLogin() {
        try {
            const { data: drivers, error } = await supabase
                .from(AppConfig.TABLES.DRIVERS)
                .select('id, name, username')
                .eq('status', 'active')
                .order('name');
            
            if (error) throw error;
            
            const select = document.getElementById('driverUsername');
            if (!select) return;
            
            select.innerHTML = '<option value="">Selecciona repartidor</option>';
            
            drivers.forEach(driver => {
                const option = document.createElement('option');
                option.value = driver.id;
                option.textContent = `${driver.name} (${driver.username})`;
                select.appendChild(option);
            });
            
            return drivers;
        } catch (error) {
            console.error('Error cargando repartidores para login:', error);
            return [];
        }
    }
};

// Funciones globales para login
window.loginAsAdmin = async function() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    
    if (!email || !password) {
        showToast('Por favor, completa todos los campos', 'warning');
        return;
    }
    
    const result = await AuthManager.loginAsAdmin(email, password);
    
    if (result.success) {
        showToast(`¡Bienvenido, ${result.user.name}!`, 'success');
    } else {
        showToast(result.message, 'error');
    }
};

window.loginAsDriver = async function() {
    const driverId = document.getElementById('driverUsername').value;
    const password = document.getElementById('driverPassword').value;
    
    if (!driverId || !password) {
        showToast('Por favor, completa todos los campos', 'warning');
        return;
    }
    
    const result = await AuthManager.loginAsDriver(driverId, password);
    
    if (result.success) {
        showToast(`¡Hola, ${result.user.name}!`, 'success');
    } else {
        showToast(result.message, 'error');
    }
};

window.logout = function() {
    AuthManager.logout();
    showToast('Sesión cerrada correctamente', 'info');
};

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', async function() {
    // Cargar repartidores en select
    await AuthManager.loadDriversForLogin();
    
    // Intentar autenticación automática
    const autoLogin = await AuthManager.init();
    
    if (autoLogin) {
        showToast('Sesión recuperada', 'success');
    }
    
    // Configurar tabs de login
    setupLoginTabs();
});

function setupLoginTabs() {
    const tabs = document.querySelectorAll('.login-tabs .tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Remover clase active de todos
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Añadir clase active al tab y contenido seleccionado
            this.classList.add('active');
            document.getElementById(tabId + 'Login').classList.add('active');
        });
    });
}

// Función para mostrar toasts
function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
        </div>
        <div class="toast-content">
            <p>${message}</p>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remover después de la duración
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
    }
    
    return toast;
}

// Exportar para uso global
window.AuthManager = AuthManager;
window.showToast = showToast;
