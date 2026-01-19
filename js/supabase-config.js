// supabase-config.js - Configuración de Supabase (CORREGIDO)

// Si Supabase ya está definido, no lo redeclares
if (!window.supabase) {
    const SUPABASE_URL = 'https://gryjdkuexbepehmtcrum.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyeWpka3VleGJlcGVobXRjcnVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MDY3NzgsImV4cCI6MjA4NDI4Mjc3OH0.gZMljLMfIcrfcddM9kAHdo8XB0SWjA8BBow3TowF_UY';
    
    // Inicializar Supabase solo si no existe
    window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Configuración de la aplicación
const AppConfig = {
    // Tablas de Supabase (ajustadas a tus nombres de tabla)
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
    ],
    
    // Credenciales por defecto (modo desarrollo)
    DEFAULT_CREDENTIALS: {
        ADMIN_EMAIL: 'admin@delivery.com',
        ADMIN_PASSWORD: 'admin123',
        DRIVER_PASSWORD: '123'
    }
};

// Verificar conexión a Supabase
async function checkSupabaseConnection() {
    try {
        console.log('🔌 Verificando conexión a Supabase...');
        
        // Usar el cliente global
        if (!window.supabase) {
            throw new Error('Supabase no está inicializado');
        }
        
        const { data, error } = await window.supabase
            .from(AppConfig.TABLES.DRIVERS)
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('❌ Error de conexión:', error);
            throw error;
        }
        
        console.log('✅ Conexión exitosa a Supabase');
        
        return {
            success: true,
            message: '✅ Conectado a Supabase',
            online: true
        };
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        return {
            success: false,
            message: '⚠️ Modo offline - Usando datos locales',
            online: false,
            error: error.message
        };
    }
}

// Insertar datos iniciales
async function initializeSampleData() {
    try {
        console.log('📝 Verificando datos iniciales...');
        
        // Verificar si hay repartidores
        const { data: drivers, error: driversError } = await window.supabase
            .from(AppConfig.TABLES.DRIVERS)
            .select('count');
        
        if (driversError) throw driversError;
        
        // Si no hay repartidores, insertar datos de ejemplo
        if (!drivers || drivers.length === 0 || drivers[0].count === 0) {
            console.log('📦 Insertando datos iniciales...');
            
            // Insertar repartidores de ejemplo
            const sampleDrivers = [
                {
                    name: 'Rosa Martínez',
                    username: 'rosa',
                    email: 'rosa@empresa.com',
                    phone: '612345678',
                    vehicle: 'Motocicleta',
                    license: 'A-123456',
                    status: 'active'
                },
                {
                    name: 'Sonia López',
                    username: 'sonia',
                    email: 'sonia@empresa.com',
                    phone: '623456789',
                    vehicle: 'Coche',
                    license: 'B-234567',
                    status: 'active'
                }
            ];
            
            const { error: insertDriversError } = await window.supabase
                .from(AppConfig.TABLES.DRIVERS)
                .insert(sampleDrivers);
            
            if (insertDriversError) throw insertDriversError;
            console.log('✅ Repartidores insertados');
            
            // Insertar usuario admin
            try {
                const { error: insertUserError } = await window.supabase
                    .from(AppConfig.TABLES.USERS)
                    .insert([{
                        email: AppConfig.DEFAULT_CREDENTIALS.ADMIN_EMAIL,
                        password: AppConfig.DEFAULT_CREDENTIALS.ADMIN_PASSWORD,
                        name: 'Administrador',
                        role: 'admin'
                    }]);
                
                if (insertUserError && !insertUserError.message.includes('duplicate')) {
                    console.warn('⚠️ No se pudo insertar usuario admin:', insertUserError);
                } else {
                    console.log('✅ Usuario admin insertado');
                }
            } catch (userError) {
                console.warn('⚠️ Error con tabla users:', userError.message);
            }
        } else {
            console.log('📊 Datos ya existen, omitiendo inserción inicial');
        }
        
        return { success: true };
    } catch (error) {
        console.error('❌ Error inicializando datos:', error);
        return { success: false, error: error.message };
    }
}

// Verificar estructura de tablas
async function verifyTableStructure() {
    try {
        console.log('🔍 Verificando estructura de tablas...');
        
        // Intentar consultar cada tabla
        const checks = [
            window.supabase.from(AppConfig.TABLES.DRIVERS).select('count').limit(1),
            window.supabase.from(AppConfig.TABLES.ROUTES).select('count').limit(1),
            window.supabase.from(AppConfig.TABLES.DELIVERIES).select('count').limit(1)
        ];
        
        const results = await Promise.allSettled(checks);
        
        const errors = [];
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                const tableNames = ['drivers', 'routes', 'deliveries'];
                errors.push(`Tabla ${tableNames[index]}: ${result.reason.message}`);
            }
        });
        
        if (errors.length > 0) {
            console.warn('⚠️ Problemas con las tablas:', errors);
            return { success: false, errors };
        }
        
        console.log('✅ Todas las tablas están accesibles');
        return { success: true };
    } catch (error) {
        console.error('❌ Error verificando estructura:', error);
        return { success: false, error: error.message };
    }
}

// Inicializar base de datos
async function initializeDatabase() {
    try {
        console.log('🏗️ Inicializando base de datos...');
        
        // Verificar conexión
        const connection = await checkSupabaseConnection();
        if (!connection.success) {
            console.warn('⚠️ No hay conexión a Supabase, modo offline activado');
            return { success: true, offline: true };
        }
        
        // Verificar estructura
        const structure = await verifyTableStructure();
        if (!structure.success) {
            console.warn('⚠️ Problemas con la estructura, pero continuando...');
        }
        
        // Insertar datos iniciales
        await initializeSampleData();
        
        console.log('✅ Base de datos inicializada');
        return { success: true };
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        return { success: false, error: error.message, offline: true };
    }
}

// Exportar para uso global
window.AppConfig = AppConfig;
window.checkSupabaseConnection = checkSupabaseConnection;
window.initializeDatabase = initializeDatabase;
window.verifyTableStructure = verifyTableStructure;
