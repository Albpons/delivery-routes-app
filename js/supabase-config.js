// Configuración de Supabase
const SUPABASE_URL = 'https://gryjdkuexbepehmtcrum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyeWpka3VleGJlcGVobXRjcnVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MDY3NzgsImV4cCI6MjA4NDI4Mjc3OH0.gZMljLMfIcrfcddM9kAHdo8XB0SWjA8BBow3TowF_UY';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Configuración de la aplicación
const AppConfig = {
    // Tablas de Supabase
    TABLES: {
        DRIVERS: 'drivers',
        ROUTES: 'routes',
        DELIVERIES: 'deliveries',
        USERS: 'users'
    },
    
    // Estados
    STATUS: {
        PENDING: 'pending',
        ACTIVE: 'active',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    },
    
    // Columnas CSV esperadas
    CSV_COLUMNS: [
        'Cliente',
        'Dirección',
        'Teléfono',
        'Ruta',
        'Comanda',
        'Observaciones'
    ],
    
    // Tipos de vehículo
    VEHICLE_TYPES: [
        'Motocicleta',
        'Coche',
        'Furgoneta',
        'Bicicleta',
        'Patinete'
    ],
    
    // Rutas por defecto
    DEFAULT_ROUTES: [
        'Ruta Centro',
        'Ruta Norte',
        'Ruta Sur',
        'Ruta Este',
        'Ruta Oeste',
        'Ruta Express'
    ]
};

// Verificar conexión a Supabase
async function checkSupabaseConnection() {
    try {
        const { data, error } = await supabase
            .from(AppConfig.TABLES.DRIVERS)
            .select('count')
            .limit(1);
        
        if (error) throw error;
        
        return {
            success: true,
            message: '✅ Conectado a Supabase',
            online: true
        };
    } catch (error) {
        console.error('Error de conexión a Supabase:', error);
        return {
            success: false,
            message: '⚠️ Modo offline - Usando datos locales',
            online: false,
            error: error.message
        };
    }
}

// Crear tablas si no existen (ejecutar una sola vez)
async function initializeDatabase() {
    try {
        // Verificar si las tablas existen
        const { data: tables, error } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');
        
        if (error) throw error;
        
        const tableNames = tables.map(t => t.table_name);
        
        // Crear tabla de repartidores si no existe
        if (!tableNames.includes('drivers')) {
            const { error: driversError } = await supabase.rpc('create_drivers_table');
            if (driversError) console.warn('No se pudo crear tabla drivers:', driversError);
        }
        
        // Crear tabla de rutas si no existe
        if (!tableNames.includes('routes')) {
            const { error: routesError } = await supabase.rpc('create_routes_table');
            if (routesError) console.warn('No se pudo crear tabla routes:', routesError);
        }
        
        // Crear tabla de entregas si no existe
        if (!tableNames.includes('deliveries')) {
            const { error: deliveriesError } = await supabase.rpc('create_deliveries_table');
            if (deliveriesError) console.warn('No se pudo crear tabla deliveries:', deliveriesError);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error inicializando base de datos:', error);
        return { success: false, error: error.message };
    }
}

// Exportar para uso global
window.supabase = supabase;
window.AppConfig = AppConfig;
window.checkSupabaseConnection = checkSupabaseConnection;
window.initializeDatabase = initializeDatabase;
