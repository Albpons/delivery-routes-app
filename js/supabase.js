// supabase.js - Configuración CORREGIDA para GitHub Pages

// Configuración
const SUPABASE_URL = 'https://gryjdkuexbepehmtcrum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyeWpka3VleGJlcGVobXRjcnVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MDY3NzgsImV4cCI6MjA4NDI4Mjc3OH0.gZMljLMfIcrfcddM9kAHdo8XB0SWjA8BBow3TowF_UY';

// Crear cliente de Supabase de forma segura
function initSupabase() {
    console.log('🔄 Inicializando Supabase...');
    
    // Verificar que la librería esté cargada
    if (typeof supabase === 'undefined') {
        console.error('❌ Error: Supabase SDK no está cargado');
        return null;
    }
    
    try {
        // Crear cliente con configuración optimizada
        const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false,
                storageKey: 'delivery-routes-supabase',
                storage: window.localStorage
            },
            global: {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        });
        
        console.log('✅ Cliente Supabase creado');
        return client;
        
    } catch (error) {
        console.error('❌ Error creando cliente Supabase:', error);
        return null;
    }
}

// Inicializar y asignar a window
document.addEventListener('DOMContentLoaded', function() {
    // Pequeño retraso para asegurar que el SDK esté cargado
    setTimeout(() => {
        const client = initSupabase();
        if (client) {
            window.supabase = client;
            console.log('🚀 Supabase asignado a window.supabase');
        } else {
            console.warn('⚠️ Supabase no disponible, usando modo offline');
        }
    }, 500);
});

// Funciones de utilidad para Supabase
const SupabaseManager = {
    // Verificar conexión
    async checkConnection() {
        try {
            // Esperar a que supabase esté disponible
            if (!window.supabase) {
                await new Promise(resolve => {
                    const check = setInterval(() => {
                        if (window.supabase) {
                            clearInterval(check);
                            resolve();
                        }
                    }, 100);
                });
            }
            
            const { data, error } = await window.supabase.auth.getSession();
            
            if (error) {
                console.error('Error de conexión Supabase:', error);
                return { success: false, error: error.message };
            }
            
            return { success: true };
            
        } catch (error) {
            console.error('Excepción en checkConnection:', error);
            return { success: false, error: error.message };
        }
    },

    // Sincronizar datos locales con Supabase
    async syncLocalToSupabase() {
        console.log('🔄 Sincronizando datos locales con Supabase...');
        
        try {
            if (!window.supabase) {
                throw new Error('Supabase no disponible');
            }
            
            const localRoutes = JSON.parse(localStorage.getItem('delivery_routes') || '[]');
            const localDeliveries = JSON.parse(localStorage.getItem('delivery_deliveries') || '[]');
            const localDrivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
            
            let syncedCount = 0;
            
            // Sincronizar rutas
            if (localRoutes.length > 0) {
                for (const route of localRoutes) {
                    try {
                        const { error } = await window.supabase
                            .from('routes')
                            .upsert({
                                id: route.id,
                                name: route.name,
                                driver: route.driver,
                                status: route.status,
                                deliveries: route.deliveries,
                                completed: route.completed,
                                description: route.description,
                                created_at: route.createdAt || new Date().toISOString()
                            }, { onConflict: 'id' });
                        
                        if (!error) syncedCount++;
                    } catch (e) {
                        console.error('Error sincronizando ruta:', e);
                    }
                }
            }
            
            // Sincronizar entregas
            if (localDeliveries.length > 0) {
                for (const delivery of localDeliveries) {
                    try {
                        const { error } = await window.supabase
                            .from('deliveries')
                            .upsert({
                                id: delivery.id,
                                client: delivery.client,
                                address: delivery.address,
                                phone: delivery.phone,
                                route: delivery.route,
                                order_details: delivery.order,
                                observations: delivery.observations,
                                status: delivery.status,
                                created_at: delivery.createdAt || new Date().toISOString()
                            }, { onConflict: 'id' });
                        
                        if (!error) syncedCount++;
                    } catch (e) {
                        console.error('Error sincronizando entrega:', e);
                    }
                }
            }
            
            // Sincronizar repartidores
            if (localDrivers.length > 0) {
                for (const driver of localDrivers) {
                    try {
                        const { error } = await window.supabase
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
                                created_at: new Date().toISOString()
                            }, { onConflict: 'id' });
                        
                        if (!error) syncedCount++;
                    } catch (e) {
                        console.error('Error sincronizando repartidor:', e);
                    }
                }
            }
            
            console.log(`✅ Sincronizados ${syncedCount} registros a Supabase`);
            return { success: true, count: syncedCount };
            
        } catch (error) {
            console.error('❌ Error en sincronización:', error);
            return { success: false, error: error.message };
        }
    },

    // Verificar si estamos en modo offline
    isOnline() {
        return navigator.onLine;
    },

    // Estrategia de caché para modo offline
    async withCacheFallback(operation, cacheKey) {
        if (this.isOnline() && window.supabase) {
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
    }
};

// Exportar para uso global
window.SupabaseManager = SupabaseManager;
