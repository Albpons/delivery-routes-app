// manualGuide.js - Guía para el flujo manual - CORREGIDO
const ManualGuide = {
    // Mostrar guía inicial
    showInitialGuide: async function() {
        // Verificar si existe el DataManagerSupabase
        if (!window.DataManagerSupabase) {
            console.log('DataManagerSupabase no está disponible aún');
            return;
        }
        
        // Verificar si el usuario está autenticado como admin
        if (!window.AuthManagerSupabase || !window.AuthManagerSupabase.currentUser) {
            return;
        }
        
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            
            const hasRoutes = routes.length > 0;
            const hasDeliveries = deliveries.length > 0;
            
            if (!hasRoutes && !hasDeliveries && AuthManagerSupabase.currentUser.role === 'admin') {
                console.log(`
                ============================================
                GUÍA PARA USO MANUAL - DELIVERY ROUTES
                ============================================
                
                FLUJO RECOMENDADO:
                
                1. PRIMERO: Ve a "Repartidores" y revisa los 5 repartidores base
                   - Usuarios: rosa, sonia, nuria, santi, albert
                   - Contraseñas: username + "123"
                
                2. CREA RUTAS MANUALMENTE:
                   - Ve a "Rutas" → "Nueva Ruta"
                   - Asigna nombre (ej: "Ruta Centro Mañana")
                   - Selecciona un repartidor
                   - Estado: "Activa"
                   - Descripción opcional
                
                3. CREA ENTREGAS MANUALMENTE:
                   - Ve a "Entregas" → "Nueva Entrega"
                   - Completa datos del cliente
                   - Asigna a una ruta existente
                   - Detalla la comanda completa
                   - Añade observaciones importantes
                
                4. LOS REPARTIDORES:
                   - Inician sesión con su usuario/contraseña
                   - Ven solo sus rutas asignadas
                   - Marcan entregas como completadas
                   - Ven comandas expandibles
                
                ============================================
                `);
                
                // Mostrar notificación amigable después de un momento
                setTimeout(() => {
                    if (window.UIManager && window.UIManager.showNotification) {
                        UIManager.showNotification(
                            '¡Bienvenido! Sigue el flujo: 1. Repartidores → 2. Rutas → 3. Entregas',
                            'info'
                        );
                    }
                }, 1500);
            }
        } catch (error) {
            console.error('Error al mostrar guía inicial:', error);
        }
    },

    // Guía para crear primera ruta
    getFirstRouteGuide: async function() {
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            
            if (routes.length === 0) {
                return `
                <div class="alert alert-info" style="margin: 20px 0; padding: 15px;">
                    <h4><i class="fas fa-info-circle"></i> Primeros pasos para crear rutas</h4>
                    <p><strong>Recomendado:</strong> Crea rutas con nombres claros como:</p>
                    <ul style="margin-left: 20px; margin-top: 10px;">
                        <li>"Ruta Centro - Mañana"</li>
                        <li>"Ruta Norte - Tarde"</li>
                        <li>"Ruta Sur - Express"</li>
                    </ul>
                    <p style="margin-top: 10px;">Asigna un repartidor de la lista. Puedes dejarlo sin asignar y cambiarlo después.</p>
                </div>
                `;
            }
        } catch (error) {
            console.error('Error obteniendo guía de primera ruta:', error);
        }
        return '';
    },

    // Guía para crear primera entrega
    getFirstDeliveryGuide: async function() {
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            
            if (routes.length === 0 && deliveries.length === 0) {
                return `
                <div class="alert alert-warning" style="margin: 20px 0; padding: 15px;">
                    <h4><i class="fas fa-exclamation-triangle"></i> ¡Crea una ruta primero!</h4>
                    <p>Necesitas crear al menos una ruta antes de poder asignar entregas.</p>
                    <button class="btn btn-primary mt-10" onclick="window.openRouteModal ? openRouteModal() : alert('Función no disponible')">
                        <i class="fas fa-plus"></i> Crear Primera Ruta
                    </button>
                </div>
                `;
            } else if (deliveries.length === 0) {
                return `
                <div class="alert alert-info" style="margin: 20px 0; padding: 15px;">
                    <h4><i class="fas fa-info-circle"></i> Creando tu primera entrega</h4>
                    <p><strong>Consejo:</strong> Copia y pega las comandas directamente de tus pedidos.</p>
                    <p>Las comandas se mostrarán de forma expandible para los repartidores.</p>
                    <p style="margin-top: 10px;"><strong>Recuerda:</strong> Asigna cada entrega a una ruta existente.</p>
                </div>
                `;
            }
        } catch (error) {
            console.error('Error obteniendo guía de primera entrega:', error);
        }
        return '';
    },

    // Guía para repartidores
    getDriverGuide: async function() {
        if (!window.AuthManagerSupabase || !AuthManagerSupabase.currentUser) {
            return '';
        }
        
        if (AuthManagerSupabase.currentUser.role === 'driver') {
            try {
                const routes = await DataManagerSupabase.getRoutesFromSupabase();
                const driverRoutes = routes.filter(route => route.driver === AuthManagerSupabase.currentUser.name);
                
                if (driverRoutes.length === 0) {
                    return `
                    <div class="alert alert-info" style="margin: 20px 0; padding: 15px;">
                        <h4><i class="fas fa-info-circle"></i> ¡Hola ${AuthManagerSupabase.currentUser.name}!</h4>
                        <p>Actualmente no tienes rutas asignadas.</p>
                        <p>Cuando el administrador te asigne rutas, aparecerán aquí.</p>
                        <p style="margin-top: 10px;"><strong>Tu usuario:</strong> ${AuthManagerSupabase.currentUser.username}</p>
                    </div>
                    `;
                }
            } catch (error) {
                console.error('Error obteniendo guía del repartidor:', error);
            }
        }
        return '';
    }
};

// Inicializar guía al cargar
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que todos los módulos se carguen
    setTimeout(() => {
        if (window.ManualGuide && window.ManualGuide.showInitialGuide) {
            ManualGuide.showInitialGuide();
        }
    }, 3000); // Aumentar tiempo de espera
});

// Exportar para uso global
window.ManualGuide = ManualGuide;
