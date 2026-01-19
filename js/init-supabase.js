// init-supabase.js
const AppInitializer = {
    async initialize() {
        console.log('🚀 Inicializando aplicación...');
        
        // 1. Inicializar Supabase
        await this.initSupabase();
        
        // 2. Inicializar autenticación
        await this.initAuth();
        
        // 3. Cargar datos iniciales
        await this.loadInitialData();
        
        // 4. Asignar eventos
        this.assignGlobalEvents();
        
        console.log('✅ Aplicación inicializada');
    },
    
    async initSupabase() {
        try {
            if (window.supabase) {
                // Verificar conexión
                const { data, error } = await window.supabase.auth.getSession();
                if (!error) {
                    console.log('✅ Supabase conectado');
                    return true;
                }
            }
            console.log('⚠️ Modo offline - Sin conexión a Supabase');
            return false;
        } catch (error) {
            console.log('🔶 Modo offline activado');
            return false;
        }
    },
    
    async initAuth() {
        if (window.AuthManagerSupabase) {
            const hasSession = await AuthManagerSupabase.init();
            if (hasSession) {
                console.log('✅ Sesión recuperada');
            }
        }
    },
    
    async loadInitialData() {
        // Solo cargar si el usuario está autenticado
        if (!window.AuthManagerSupabase || !AuthManagerSupabase.currentUser) {
            return;
        }
        
        const user = AuthManagerSupabase.currentUser;
        console.log(`📊 Cargando datos para: ${user.name} (${user.role})`);
        
        try {
            if (user.role === 'admin') {
                await this.loadAdminData();
            } else {
                await this.loadDriverData();
            }
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            UIManager?.showNotification('⚠️ Usando datos locales', 'warning');
        }
    },
    
    async loadAdminData() {
        try {
            // Intentar cargar desde Supabase
            let routes = [], deliveries = [], drivers = [];
            
            if (window.supabase && window.DataManagerSupabase) {
                console.log('📥 Intentando cargar desde Supabase...');
                routes = await DataManagerSupabase.getRoutesFromSupabase();
                deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
                drivers = await DataManagerSupabase.getDriversFromSupabase();
                
                // Guardar en localStorage como respaldo
                localStorage.setItem('delivery_routes', JSON.stringify(routes));
                localStorage.setItem('delivery_deliveries', JSON.stringify(deliveries));
                localStorage.setItem('delivery_drivers', JSON.stringify(drivers));
            } else {
                // Fallback a localStorage
                console.log('📁 Cargando desde localStorage...');
                routes = JSON.parse(localStorage.getItem('delivery_routes') || '[]');
                deliveries = JSON.parse(localStorage.getItem('delivery_deliveries') || '[]');
                drivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
            }
            
            console.log(`📊 Datos cargados: ${routes.length} rutas, ${deliveries.length} entregas, ${drivers.length} repartidores`);
            
            // Inicializar datos de demo si está vacío
            if (drivers.length === 0 && AuthManagerSupabase.currentUser.role === 'admin') {
                await this.initDemoData();
            }
            
            // Cargar UI
            if (window.UIManager) {
                UIManager.loadDashboard();
                
                // Cargar vistas específicas
                setTimeout(() => {
                    if (window.RouteManagerSupabase) RouteManagerSupabase.loadRoutes();
                    if (window.DeliveryManagerSupabase) DeliveryManagerSupabase.loadDeliveries();
                    if (window.DriverManagerSupabase) DriverManagerSupabase.loadDrivers();
                }, 300);
            }
            
        } catch (error) {
            console.error('Error en loadAdminData:', error);
            throw error;
        }
    },
    
    async loadDriverData() {
        if (window.UIManager) {
            await UIManager.loadDriverRoutes();
            await UIManager.loadDriverDeliveries();
            await UIManager.updateDriverProfile();
            UIManager.updateDriverDate();
        }
    },
    
    async initDemoData() {
        console.log('🎯 Inicializando datos de demostración...');
        
        const demoDrivers = [
            {
                id: 1,
                name: 'Rosa García',
                username: 'rosa',
                email: 'rosa@example.com',
                phone: '600111222',
                vehicle: 'Motocicleta',
                license: 'M-12345',
                status: 'active'
            },
            {
                id: 2,
                name: 'Sonia Martínez',
                username: 'sonia',
                email: 'sonia@example.com',
                phone: '600222333',
                vehicle: 'Coche',
                license: 'B-54321',
                status: 'active'
            },
            {
                id: 3,
                name: 'Nuria López',
                username: 'nuria',
                email: 'nuria@example.com',
                phone: '600333444',
                vehicle: 'Furgoneta',
                license: 'C-11223',
                status: 'active'
            },
            {
                id: 4,
                name: 'Santiago Ruiz',
                username: 'santi',
                email: 'santi@example.com',
                phone: '600444555',
                vehicle: 'Bicicleta',
                license: 'BIC-001',
                status: 'active'
            },
            {
                id: 5,
                name: 'Albert Torres',
                username: 'albert',
                email: 'albert@example.com',
                phone: '600555666',
                vehicle: 'Motocicleta',
                license: 'M-66778',
                status: 'active'
            }
        ];
        
        // Guardar drivers en localStorage
        localStorage.setItem('delivery_drivers', JSON.stringify(demoDrivers));
        
        // Intentar guardar en Supabase si está disponible
        if (window.supabase && window.DataManagerSupabase) {
            for (const driver of demoDrivers) {
                try {
                    await DataManagerSupabase.createDriver(driver);
                } catch (e) {
                    console.log('No se pudo guardar en Supabase:', e.message);
                }
            }
        }
        
        UIManager?.showNotification('✅ Datos de demostración cargados', 'success');
    },
    
    assignGlobalEvents() {
        console.log('🔗 Asignando eventos globales...');
        
        // Función global para recargar datos
        window.loadDataFromSupabase = async function() {
            if (window.UIManager) {
                UIManager.showNotification('🔄 Recargando datos...', 'info');
            }
            
            try {
                if (window.AuthManagerSupabase && AuthManagerSupabase.currentUser) {
                    if (AuthManagerSupabase.currentUser.role === 'admin') {
                        await AppInitializer.loadAdminData();
                    } else {
                        await AppInitializer.loadDriverData();
                    }
                    
                    if (window.UIManager) {
                        UIManager.showNotification('✅ Datos recargados', 'success');
                    }
                }
            } catch (error) {
                console.error('Error recargando datos:', error);
                UIManager?.showNotification('❌ Error recargando datos', 'danger');
            }
        };
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        AppInitializer.initialize();
    }, 1000);
});

window.AppInitializer = AppInitializer;
