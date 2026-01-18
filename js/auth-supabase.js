// auth-supabase.js - Autenticación con Supabase - ADMIN FIJO

const AuthManagerSupabase = {
    currentUser: null,
    session: null,
    
    // CREDENCIALES FIJAS PARA EL ADMIN
    ADMIN_CREDENTIALS: {
        username: 'admin',
        password: 'admin123',
        email: 'admin@deliveryroutes.com',
        name: 'Administrador'
    },

    // Inicializar autenticación
    async init() {
        try {
            console.log('🔄 Inicializando autenticación...');
            
            // Verificar usuario guardado en localStorage
            const savedUser = localStorage.getItem('currentUser');
            
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                
                // Verificar que el usuario tenga datos válidos
                if (this.currentUser && this.currentUser.role) {
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

    // Iniciar sesión
    async login(email, password, userType) {
        try {
            console.log('🔐 Intentando login:', { email, userType });
            
            if (userType === 'admin') {
                return await this.loginAdmin(email, password);
            } else {
                return await this.loginDriver(email, password);
            }
            
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, message: error.message || 'Error desconocido' };
        }
    },

    // Login para admin - CREDENCIALES FIJAS
    async loginAdmin(email, password) {
        try {
            // Limpiar y normalizar entradas
            const inputUsername = email.trim().toLowerCase();
            const inputPassword = password.trim();
            
            // Verificar credenciales fijas
            const isAdminValid = 
                (inputUsername === this.ADMIN_CREDENTIALS.username || 
                 inputUsername === this.ADMIN_CREDENTIALS.email) &&
                inputPassword === this.ADMIN_CREDENTIALS.password;
            
            if (!isAdminValid) {
                return { 
                    success: false, 
                    message: 'Credenciales incorrectas para administrador' 
                };
            }
            
            // Credenciales correctas - crear sesión admin
            this.currentUser = {
                id: 1,
                name: this.ADMIN_CREDENTIALS.name,
                email: this.ADMIN_CREDENTIALS.email,
                username: this.ADMIN_CREDENTIALS.username,
                role: 'admin',
                isFixedAdmin: true // Marcar como admin fijo
            };
            
            // Guardar en localStorage
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            // Mostrar app
            this.showAppBasedOnRole();
            
            return { 
                success: true, 
                user: this.currentUser,
                message: '✅ Administrador autenticado correctamente'
            };
            
        } catch (error) {
            console.error('Error loginAdmin:', error);
            return { 
                success: false, 
                message: 'Error al iniciar sesión como administrador' 
            };
        }
    },

    // Login para driver - Mantener lógica existente
    async loginDriver(username, password) {
        try {
            const cleanUsername = username.toLowerCase().trim();
            const cleanPassword = password.trim();
            
            // Intentar con Supabase primero
            if (window.supabase) {
                const { data: drivers, error } = await window.supabase
                    .from('drivers')
                    .select('*')
                    .eq('username', cleanUsername);
                
                if (!error && drivers.length > 0) {
                    const driver = drivers[0];
                    
                    // Verificar contraseña (simple para demo)
                    if (cleanPassword !== driver.username + '123') {
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
            
            // Fallback a datos locales
            const localDrivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
            const driver = localDrivers.find(d => d.username === cleanUsername);
            
            if (!driver) {
                return { success: false, message: 'Usuario no encontrado' };
            }
            
            // Verificar contraseña (simple para demo)
            if (cleanPassword !== driver.username + '123') {
                return { success: false, message: 'Contraseña incorrecta' };
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
            this.currentUser = null;
            localStorage.removeItem('currentUser');
            
            // Mostrar login
            document.getElementById('loginPage').classList.remove('hidden');
            document.getElementById('adminApp').classList.add('hidden');
            document.getElementById('driverApp').classList.add('hidden');
            
            // Limpiar campos de login
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            
            // Resetear a admin por defecto
            document.getElementById('adminOption').classList.add('active');
            document.getElementById('driverOption').classList.remove('active');
            
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
        
        console.log('👤 Mostrando app para:', this.currentUser.name, 'Rol:', this.currentUser.role);
        
        // Ocultar login
        document.getElementById('loginPage').classList.add('hidden');
        
        // Mostrar app según rol
        if (this.currentUser.role === 'admin') {
            document.getElementById('adminApp').classList.remove('hidden');
            this.updateAdminUI();
            
            // Cargar datos para admin
            setTimeout(() => {
                this.loadAdminData();
            }, 300);
            
        } else {
            document.getElementById('driverApp').classList.remove('hidden');
            this.updateDriverUI();
            
            // Cargar datos para driver
            setTimeout(() => {
                this.loadDriverData();
            }, 300);
        }
    },

    // Cargar datos para admin
    async loadAdminData() {
        try {
            // Verificar conexión
            if (window.supabase) {
                console.log('📊 Intentando cargar datos desde Supabase...');
                if (window.DataManagerSupabase) {
                    await DataManagerSupabase.loadInitialData();
                }
            }
            
            // Cargar UI
            if (window.UIManager) {
                UIManager.loadDashboard();
                
                // Forzar carga de vistas si existen
                setTimeout(() => {
                    if (window.RouteManagerSupabase) RouteManagerSupabase.loadRoutes();
                    if (window.DeliveryManagerSupabase) DeliveryManagerSupabase.loadDeliveries();
                    if (window.DriverManagerSupabase) DriverManagerSupabase.loadDrivers();
                }, 500);
            }
            
        } catch (error) {
            console.error('Error cargando datos admin:', error);
        }
    },

    // Cargar datos para driver
    async loadDriverData() {
        try {
            if (window.UIManager) {
                await UIManager.loadDriverRoutes();
                await UIManager.loadDriverDeliveries();
                await UIManager.updateDriverProfile();
                UIManager.updateDriverDate();
            }
        } catch (error) {
            console.error('Error cargando datos driver:', error);
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
        
        // Mostrar que es admin fijo
        console.log('✅ Admin UI actualizada - Usuario fijo activo');
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
    },

    // Verificar si el usuario está autenticado
    isAuthenticated() {
        return !!this.currentUser;
    },

    // Obtener información del usuario actual
    getUserInfo() {
        return this.currentUser;
    },
    
    // Cambiar contraseña del admin (función simple)
    changeAdminPassword(oldPassword, newPassword) {
        if (oldPassword !== this.ADMIN_CREDENTIALS.password) {
            return { success: false, message: 'Contraseña actual incorrecta' };
        }
        
        if (newPassword.length < 6) {
            return { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres' };
        }
        
        // Actualizar contraseña en memoria (en producción se guardaría en BD)
        this.ADMIN_CREDENTIALS.password = newPassword;
        
        // Nota: En una aplicación real, esto se guardaría en una base de datos segura
        console.log('⚠️ Contraseña cambiada localmente. En producción, guardar en BD segura.');
        
        return { 
            success: true, 
            message: 'Contraseña actualizada correctamente (localmente)' 
        };
    }
};

// Función de login mejorada con feedback visual
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
    const originalDisabled = loginBtn.disabled;
    
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    loginBtn.disabled = true;
    
    // Deshabilitar otros botones
    const adminBtn = document.getElementById('adminOption');
    const driverBtn = document.getElementById('driverOption');
    if (adminBtn && driverBtn) {
        adminBtn.style.pointerEvents = 'none';
        driverBtn.style.pointerEvents = 'none';
    }
    
    try {
        const result = await AuthManagerSupabase.login(email, password, userType);
        
        if (!result.success) {
            // Mostrar error en el login
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger mt-20';
            errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${result.message}`;
            
            // Eliminar errores anteriores
            const existingError = document.querySelector('#loginPage .alert-danger');
            if (existingError) existingError.remove();
            
            // Insertar después del botón
            loginBtn.parentNode.insertBefore(errorDiv, loginBtn.nextSibling);
            
            // Hacer vibrar el formulario
            document.querySelector('.login-card').classList.add('shake');
            setTimeout(() => {
                document.querySelector('.login-card').classList.remove('shake');
            }, 500);
            
        } else {
            // Mostrar éxito
            if (window.UIManager && UIManager.showNotification) {
                UIManager.showNotification(result.message || '✅ Sesión iniciada correctamente', 'success');
            }
        }
        
    } catch (error) {
        console.error('Error en loginSupabase:', error);
        alert('Error inesperado: ' + error.message);
    } finally {
        // Restaurar botón
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = originalDisabled;
        
        // Habilitar botones de tipo de usuario
        if (adminBtn && driverBtn) {
            adminBtn.style.pointerEvents = 'auto';
            driverBtn.style.pointerEvents = 'auto';
        }
    }
}

// Función de logout
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
        
        // Actualizar placeholder
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.placeholder = 'Usuario: admin';
        }
    } else {
        driverOption.classList.add('active');
        adminOption.classList.remove('active');
        
        // Actualizar placeholder
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.placeholder = 'Usuario: rosa, sonia, nuria...';
        }
    }
    
    // Limpiar errores anteriores
    const existingError = document.querySelector('#loginPage .alert-danger');
    if (existingError) existingError.remove();
}

// Función para cambiar contraseña del admin (opcional)
window.changeAdminPassword = function() {
    const oldPass = prompt('Contraseña actual:');
    if (!oldPass) return;
    
    const newPass = prompt('Nueva contraseña (mínimo 6 caracteres):');
    if (!newPass || newPass.length < 6) {
        alert('La nueva contraseña debe tener al menos 6 caracteres');
        return;
    }
    
    const confirmPass = prompt('Confirmar nueva contraseña:');
    if (newPass !== confirmPass) {
        alert('Las contraseñas no coinciden');
        return;
    }
    
    const result = AuthManagerSupabase.changeAdminPassword(oldPass, newPass);
    alert(result.message);
};

// Inicializar eventos cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Configurar placeholder inicial
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.placeholder = 'Usuario: admin';
    }
    
    // Añadir evento para enter
    document.getElementById('password')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginSupabase();
        }
    });
    
    // Mostrar instrucciones de login
    setTimeout(() => {
        const loginCard = document.querySelector('.login-card p');
        if (loginCard) {
            loginCard.innerHTML += '<br><small style="font-size: 12px; color: #666;">Admin: <strong>admin / admin123</strong></small>';
        }
    }, 1000);
});

// Exportar para uso global
window.AuthManagerSupabase = AuthManagerSupabase;
window.loginSupabase = loginSupabase;
window.logoutSupabase = logoutSupabase;
window.selectUserType = selectUserType;
