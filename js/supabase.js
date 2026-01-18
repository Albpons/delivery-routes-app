// supabase.js - Configuración y funciones base de Supabase
const SUPABASE_URL = 'https://gryjdkuexbepehmtcrum.supabase.co'; // Reemplaza con tu URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyeWpka3VleGJlcGVobXRjcnVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MDY3NzgsImV4cCI6MjA4NDI4Mjc3OH0.gZMljLMfIcrfcddM9kAHdo8XB0SWjA8BBow3TowF_UY'; // Reemplaza con tu clave

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Funciones de utilidad para Supabase
const SupabaseManager = {
    // Verificar conexión
    async checkConnection() {
        try {
            const { data, error } = await supabase
                .from('routes')
                .select('count')
                .limit(1);
            
            return { success: !error, error };
        } catch (error) {
            return { success: false, error };
        }
    },

    // Sincronizar datos locales con Supabase
    async syncLocalToSupabase() {
        console.log('🔄 Sincronizando datos locales con Supabase...');
        
        try {
            // Obtener datos locales
            const localRoutes = JSON.parse(localStorage.getItem('delivery_routes') || '[]');
            const localDeliveries = JSON.parse(localStorage.getItem('delivery_deliveries') || '[]');
            const localDrivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
            
            let syncedCount = 0;
            
            // Sincronizar rutas
            if (localRoutes.length > 0) {
                for (const route of localRoutes) {
                    const { error } = await supabase
                        .from('routes')
                        .upsert({
                            id: route.id,
                            name: route.name,
                            driver: route.driver,
                            status: route.status,
                            deliveries: route.deliveries,
                            completed: route.completed,
                            description: route.description,
                            created_at: route.createdAt || new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'id' });
                    
                    if (!error) syncedCount++;
                }
            }
            
            // Sincronizar entregas
            if (localDeliveries.length > 0) {
                for (const delivery of localDeliveries) {
                    const { error } = await supabase
                        .from('deliveries')
                        .upsert({
                            id: delivery.id,
                            client: delivery.client,
                            address: delivery.address,
                            phone: delivery.phone,
                            route: delivery.route,
                            order: delivery.order,
                            observations: delivery.observations,
                            status: delivery.status,
                            created_at: delivery.createdAt || new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'id' });
                    
                    if (!error) syncedCount++;
                }
            }
            
            // Sincronizar repartidores
            if (localDrivers.length > 0) {
                for (const driver of localDrivers) {
                    const { error } = await supabase
                        .from('drivers')
                        .upsert({
                            id: driver.id,
                            name: driver.name,
                            username: driver.username,
                            email: driver.email,
                            phone: driver.phone,
                            vehicle: driver.vehicle,
                            license: driver.license,
                            deliveries: driver.deliveries,
                            status: driver.status,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'id' });
                    
                    if (!error) syncedCount++;
                }
            }
            
            console.log(`✅ Sincronizados ${syncedCount} registros a Supabase`);
            return { success: true, count: syncedCount };
            
        } catch (error) {
            console.error('❌ Error en sincronización:', error);
            return { success: false, error };
        }
    },

    // Verificar si estamos en modo offline
    isOnline() {
        return navigator.onLine;
    },

    // Estrategia de caché para modo offline
    async withCacheFallback(operation, cacheKey) {
        if (this.isOnline()) {
            try {
                const result = await operation();
                // Guardar en caché local
                if (result.data) {
                    localStorage.setItem(cacheKey, JSON.stringify(result.data));
                }
                return result;
            } catch (error) {
                console.warn('⚠️ Error online, usando caché:', error);
                // Fallback a caché
                const cached = localStorage.getItem(cacheKey);
                return { data: cached ? JSON.parse(cached) : [], error: null };
            }
        } else {
            console.log('📴 Modo offline activado, usando caché local');
            const cached = localStorage.getItem(cacheKey);
            return { data: cached ? JSON.parse(cached) : [], error: null };
        }
    },

    // Suscribirse a cambios en tiempo real
    subscribeToChanges(table, event, callback) {
        return supabase
            .channel('public:' + table)
            .on('postgres_changes', 
                { event: event, schema: 'public', table: table }, 
                callback
            )
            .subscribe();
    }
};

// Exportar para uso global
window.supabase = supabase;
window.SupabaseManager = SupabaseManager;
