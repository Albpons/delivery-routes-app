// drivers-supabase.js - Gestión de repartidores con Supabase
const DriverManagerSupabase = {
    editingDriverId: null,

    // Abrir modal (igual que antes)
    openDriverModal: function(driverId = null) {
        // Mismo código que drivers.js...
    },

    // Cargar repartidores desde Supabase
    async loadDrivers() {
        try {
            const drivers = await DataManagerSupabase.getDriversFromSupabase();
            const driversGrid = document.getElementById('driversGrid');
            
            // Mismo código de renderizado que drivers.js...
            
        } catch (error) {
            console.error('Error cargando repartidores:', error);
            UIManager.showNotification('❌ Error cargando repartidores', 'danger');
        }
    },

    // Guardar repartidor
    async saveDriver() {
        const name = document.getElementById('driverName').value;
        const email = document.getElementById('driverEmail').value;
        const phone = document.getElementById('driverPhone').value;
        const vehicle = document.getElementById('driverVehicle').value;
        const license = document.getElementById('driverLicense').value;
        
        if (!name || !email) {
            alert('Por favor, completa los campos obligatorios');
            return;
        }
        
        const driverData = {
            name,
            email,
            phone,
            vehicle,
            license,
            username: name.toLowerCase().replace(/\s+/g, ''),
            deliveries: 0,
            status: 'active'
        };
        
        try {
            let result;
            
            if (this.editingDriverId) {
                driverData.id = this.editingDriverId;
                result = await DataManagerSupabase.updateDriver(driverData);
            } else {
                result = await DataManagerSupabase.createDriver(driverData);
            }
            
            if (result.success) {
                UIManager.showNotification('✅ Repartidor guardado', 'success');
                this.closeDriverModal();
                await this.loadDrivers();
                UIManager.loadDashboard();
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('Error guardando repartidor:', error);
            UIManager.showNotification('❌ Error guardando repartidor', 'danger');
        }
    },

    // Resto de funciones similares a drivers.js...
};

// Exportar
window.DriverManagerSupabase = DriverManagerSupabase;
window.openDriverModal = DriverManagerSupabase.openDriverModal.bind(DriverManagerSupabase);
window.closeDriverModal = DriverManagerSupabase.closeDriverModal.bind(DriverManagerSupabase);
window.saveDriver = DriverManagerSupabase.saveDriver.bind(DriverManagerSupabase);
window.editDriver = DriverManagerSupabase.editDriver.bind(DriverManagerSupabase);
window.deleteDriver = DriverManagerSupabase.deleteDriver.bind(DriverManagerSupabase);
