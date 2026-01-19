// Configuración de Supabase
const SUPABASE_URL = 'https://gryjdkuexbepehmtcrum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyeWpka3VleGJlcGVobXRjcnVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MDY3NzgsImV4cCI6MjA4NDI4Mjc3OH0.gZMljLMfIcrfcddM9kAHdo8XB0SWjA8BBow3TowF_UY';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
        DRIVER_PASSWORD: '123'  // Contraseña para todos los repartidores
    }
};

// Verificar conexión a Supabase
async function checkSupabaseConnection() {
    try {
        console.log('🔌 Verificando conexión a Supabase...');
        
        const { data, error } = await supabase
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

// Insertar datos iniciales si las tablas están vacías
async function initializeSampleData() {
    try {
        console.log('📝 Verificando datos iniciales...');
        
        // Verificar si hay repartidores
        const { data: drivers, error: driversError } = await supabase
            .from(AppConfig.TABLES.DRIVERS)
            .select('count');
        
        if (driversError) throw driversError;
        
        // Si no hay repartidores, insertar datos de ejemplo
        if (drivers[0].count === 0) {
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
                },
                {
                    name: 'Nuria García',
                    username: 'nuria',
                    email: 'nuria@empresa.com',
                    phone: '634567890',
                    vehicle: 'Furgoneta',
                    license: 'C-345678',
                    status: 'active'
                },
                {
                    name: 'Santi Pérez',
                    username: 'santi',
                    email: 'santi@empresa.com',
                    phone: '645678901',
                    vehicle: 'Bicicleta',
                    license: 'D-456789',
                    status: 'active'
                },
                {
                    name: 'Albert Ruiz',
                    username: 'albert',
                    email: 'albert@empresa.com',
                    phone: '656789012',
                    vehicle: 'Motocicleta',
                    license: 'E-567890',
                    status: 'active'
                }
            ];
            
            const { error: insertDriversError } = await supabase
                .from(AppConfig.TABLES.DRIVERS)
                .insert(sampleDrivers);
            
            if (insertDriversError) throw insertDriversError;
            console.log('✅ Repartidores insertados');
            
            // Insertar usuario admin
            const { error: insertUserError } = await supabase
                .from(AppConfig.TABLES.USERS)
                .insert([{
                    email: AppConfig.DEFAULT_CREDENTIALS.ADMIN_EMAIL,
                    password: AppConfig.DEFAULT_CREDENTIALS.ADMIN_PASSWORD,
                    name: 'Administrador',
                    role: 'admin'
                }]);
            
            if (insertUserError) {
                console.warn('⚠️ No se pudo insertar usuario admin:', insertUserError);
            } else {
                console.log('✅ Usuario admin insertado');
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

// Crear políticas de seguridad (RLS) si no existen
async function setupRLSPolicies() {
    try {
        console.log('🔐 Configurando políticas de seguridad...');
        
        // Nota: Esto requiere permisos de administrador en Supabase
        // En producción, deberías configurar esto desde el dashboard de Supabase
        
        return { success: true };
    } catch (error) {
        console.warn('⚠️ No se pudieron configurar políticas RLS:', error);
        return { success: false, error: error.message };
    }
}

// Función para verificar y ajustar estructura de tablas
async function verifyTableStructure() {
    try {
        console.log('🔍 Verificando estructura de tablas...');
        
        // Verificar columnas en tabla deliveries
        const { data: columns, error } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type')
            .eq('table_name', 'deliveries')
            .eq('table_schema', 'public');
        
        if (error) throw error;
        
        const columnNames = columns.map(col => col.column_name);
        
        // Verificar si existe la columna 'order' (en lugar de 'order_details')
        if (columnNames.includes('order') && !columnNames.includes('order_details')) {
            console.log('⚠️ Tabla deliveries usa columna "order" en lugar de "order_details"');
            
            // Para desarrollo, podemos usar 'order' en lugar de 'order_details'
            AppConfig.COLUMN_MAPPING = {
                order_details: 'order'
            };
        } else {
            AppConfig.COLUMN_MAPPING = {
                order_details: 'order_details'
            };
        }
        
        console.log('✅ Estructura verificada');
        return { success: true, columnMapping: AppConfig.COLUMN_MAPPING };
    } catch (error) {
        console.error('❌ Error verificando estructura:', error);
        return { success: false, error: error.message };
    }
}

// Inicializar base de datos completa
async function initializeDatabase() {
    try {
        // Verificar conexión
        const connection = await checkSupabaseConnection();
        if (!connection.success) {
            return connection;
        }
        
        // Verificar estructura
        const structure = await verifyTableStructure();
        if (!structure.success) {
            return structure;
        }
        
        // Insertar datos iniciales
        await initializeSampleData();
        
        // Configurar políticas (opcional)
        await setupRLSPolicies();
        
        return { 
            success: true, 
            message: '✅ Base de datos inicializada correctamente',
            columnMapping: structure.columnMapping
        };
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        return { success: false, error: error.message };
    }
}

// Función para obtener el nombre correcto de la columna de comanda
function getOrderColumnName() {
    return AppConfig.COLUMN_MAPPING?.order_details || 'order_details';
}

// Exportar para uso global
window.supabase = supabase;
window.AppConfig = AppConfig;
window.checkSupabaseConnection = checkSupabaseConnection;
window.initializeDatabase = initializeDatabase;
window.getOrderColumnName = getOrderColumnName;
