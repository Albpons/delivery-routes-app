// deliveries-supabase.js - Gestión de entregas con Supabase
const DeliveryManagerSupabase = {
    editingDeliveryId: null,

    // Abrir modal (igual que antes)
    openDeliveryModal: function(deliveryId = null) {
        // Mismo código que deliveries.js...
    },

    // Cargar entregas desde Supabase
    async loadDeliveries() {
        try {
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            const deliveriesTable = document.getElementById('deliveriesTable');
            
            // Mismo código de renderizado que deliveries.js...
            // Solo cambiar las llamadas a DataManager.getDeliveries() por deliveries
            
        } catch (error) {
            console.error('Error cargando entregas:', error);
            UIManager.showNotification('❌ Error cargando entregas', 'danger');
        }
    },

    // Guardar entrega
    async saveDelivery() {
        const client = document.getElementById('deliveryClient').value;
        const address = document.getElementById('deliveryAddress').value;
        const phone = document.getElementById('deliveryPhone').value;
        const route = document.getElementById('deliveryRoute').value;
        const order = document.getElementById('deliveryOrder').value;
        const observations = document.getElementById('deliveryObservations').value;
        const status = document.getElementById('deliveryStatus').value;
        
        if (!client || !address) {
            alert('Por favor, completa los campos obligatorios');
            return;
        }
        
        const deliveryData = {
            client,
            address,
            phone,
            route,
            order,
            observations,
            status
        };
        
        try {
            let result;
            
            if (this.editingDeliveryId) {
                deliveryData.id = this.editingDeliveryId;
                result = await DataManagerSupabase.updateDelivery(deliveryData);
            } else {
                result = await DataManagerSupabase.createDelivery(deliveryData);
            }
            
            if (result.success) {
                UIManager.showNotification('✅ Entrega guardada correctamente', 'success');
                this.closeDeliveryModal();
                await this.loadDeliveries();
                UIManager.loadDashboard();
                
                // Actualizar rutas si es necesario
                if (route) {
                    await RouteManagerSupabase.loadRoutes();
                }
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('Error guardando entrega:', error);
            UIManager.showNotification('❌ Error guardando entrega', 'danger');
        }
    },

    // Marcar como completada
    async markDeliveryCompleted(deliveryId) {
        try {
            // Obtener entrega actual
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            const delivery = deliveries.find(d => d.id === deliveryId);
            
            if (!delivery) return;
            
            // Actualizar estado
            const updatedDelivery = {
                ...delivery,
                status: 'completed'
            };
            
            const result = await DataManagerSupabase.updateDelivery(updatedDelivery);
            
            if (result.success) {
                UIManager.showNotification('✅ Entrega completada', 'success');
                await this.loadDeliveries();
                UIManager.loadDashboard();
                
                // Si es repartidor, recargar sus vistas
                if (AuthManagerSupabase.currentUser?.role === 'driver') {
                    UIManager.loadDriverRoutes();
                    UIManager.loadDriverDeliveries();
                }
            }
            
        } catch (error) {
            console.error('Error completando entrega:', error);
            UIManager.showNotification('❌ Error completando entrega', 'danger');
        }
    },

    // Resto de funciones similares a deliveries.js...
};

// Exportar
window.DeliveryManagerSupabase = DeliveryManagerSupabase;
window.openDeliveryModal = DeliveryManagerSupabase.openDeliveryModal.bind(DeliveryManagerSupabase);
window.closeDeliveryModal = DeliveryManagerSupabase.closeDeliveryModal.bind(DeliveryManagerSupabase);
window.saveDelivery = DeliveryManagerSupabase.saveDelivery.bind(DeliveryManagerSupabase);
window.editDelivery = DeliveryManagerSupabase.editDelivery.bind(DeliveryManagerSupabase);
window.deleteDelivery = DeliveryManagerSupabase.deleteDelivery.bind(DeliveryManagerSupabase);
window.markDeliveryCompleted = DeliveryManagerSupabase.markDeliveryCompleted.bind(DeliveryManagerSupabase);
