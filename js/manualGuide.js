// Guía para el flujo manual - Archivo nuevo
const ManualGuide = {
    // Mostrar guía inicial
    showInitialGuide: function() {
        const hasRoutes = DataManager.getRoutes().length > 0;
        const hasDeliveries = DataManager.getDeliveries().length > 0;
        
        if (!hasRoutes && !hasDeliveries && AuthManager.currentUser && AuthManager.currentUser.type === 'admin') {
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
                UIManager.showNotification(
                    '¡Bienvenido! Sigue el flujo: 1. Repartidores → 2. Rutas → 3. Entregas',
                    'info'
                );
            }, 1500);
        }
    },

    // Guía para crear primera ruta
    getFirstRouteGuide: function() {
        const routes = DataManager.getRoutes();
        
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
        
        return '';
    },

    // Guía para crear primera entrega
    getFirstDeliveryGuide: function() {
        const routes = DataManager.getRoutes();
        const deliveries = DataManager.getDeliveries();
        
        if (routes.length === 0 && deliveries.length === 0) {
            return `
            <div class="alert alert-warning" style="margin: 20px 0; padding: 15px;">
                <h4><i class="fas fa-exclamation-triangle"></i> ¡Crea una ruta primero!</h4>
                <p>Necesitas crear al menos una ruta antes de poder asignar entregas.</p>
                <button class="btn btn-primary mt-10" onclick="RouteManager.openRouteModal()">
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
        
        return '';
    },

    // Guía para repartidores
    getDriverGuide: function() {
        if (AuthManager.currentUser && AuthManager.currentUser.type === 'driver') {
            const driverRoutes = DataManager.getRoutesByDriverName(AuthManager.currentUser.name);
            
            if (driverRoutes.length === 0) {
                return `
                <div class="alert alert-info" style="margin: 20px 0; padding: 15px;">
                    <h4><i class="fas fa-info-circle"></i> ¡Hola ${AuthManager.currentUser.name}!</h4>
                    <p>Actualmente no tienes rutas asignadas.</p>
                    <p>Cuando el administrador te asigne rutas, aparecerán aquí.</p>
                    <p style="margin-top: 10px;"><strong>Tu usuario:</strong> ${AuthManager.currentUser.username}</p>
                </div>
                `;
            }
        }
        
        return '';
    }
};

// Inicializar guía al cargar
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        ManualGuide.showInitialGuide();
    }, 2000);
});
