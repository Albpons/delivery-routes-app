// sync-manager.js
const SyncManager = {
    pendingChanges: [],
    isSyncing: false,
    
    init() {
        console.log('🔄 Inicializando SyncManager');
        
        // Verificar cambios pendientes al iniciar
        this.checkPendingChanges();
        
        // Sincronizar cada 30 segundos si hay conexión
        setInterval(() => {
            if (navigator.onLine && this.pendingChanges.length > 0) {
                this.syncPendingChanges();
            }
        }, 30000);
        
        // Escuchar cambios de conexión
        window.addEventListener('online', () => {
            console.log('🌐 Conexión restaurada - Sincronizando...');
            this.syncPendingChanges();
        });
    },
    
    async syncPendingChanges() {
        if (this.isSyncing || !window.supabase) return;
        
        this.isSyncing = true;
        console.log(`🔄 Sincronizando ${this.pendingChanges.length} cambios pendientes...`);
        
        const successes = [];
        const failures = [];
        
        for (const change of [...this.pendingChanges]) {
            try {
                let result;
                
                switch (change.type) {
                    case 'route':
                        if (change.action === 'create') {
                            result = await DataManagerSupabase.createRoute(change.data);
                        } else if (change.action === 'update') {
                            result = await DataManagerSupabase.updateRoute(change.data);
                        } else if (change.action === 'delete') {
                            result = await DataManagerSupabase.deleteRoute(change.data.id);
                        }
                        break;
                        
                    case 'delivery':
                        if (change.action === 'create') {
                            result = await DataManagerSupabase.createDelivery(change.data);
                        } else if (change.action === 'update') {
                            result = await DataManagerSupabase.updateDelivery(change.data);
                        } else if (change.action === 'delete') {
                            result = await DataManagerSupabase.deleteDelivery(change.data.id);
                        }
                        break;
                        
                    case 'driver':
                        if (change.action === 'create') {
                            result = await DataManagerSupabase.createDriver(change.data);
                        } else if (change.action === 'update') {
                            result = await DataManagerSupabase.updateDriver(change.data);
                        } else if (change.action === 'delete') {
                            result = await DataManagerSupabase.deleteDriver(change.data.id);
                        }
                        break;
                }
                
                if (result?.success) {
                    successes.push(change);
                    // Eliminar del array de pendientes
                    const index = this.pendingChanges.indexOf(change);
                    if (index > -1) {
                        this.pendingChanges.splice(index, 1);
                    }
                } else {
                    failures.push(change);
                }
                
            } catch (error) {
                console.error('Error en sincronización:', error);
                failures.push(change);
            }
        }
        
        this.isSyncing = false;
        
        // Guardar cambios pendientes actualizados
        this.savePendingChanges();
        
        if (successes.length > 0) {
            console.log(`✅ Sincronizados ${successes.length} cambios`);
            if (window.UIManager) {
                UIManager.showNotification(`✅ ${successes.length} cambios sincronizados`, 'success');
            }
        }
        
        if (failures.length > 0) {
            console.log(`❌ ${failures.length} cambios fallaron`);
        }
    },
    
    addChange(type, action, data) {
        const change = {
            type,
            action,
            data,
            timestamp: new Date().toISOString(),
            id: Date.now() + Math.random()
        };
        
        this.pendingChanges.push(change);
        this.savePendingChanges();
        
        console.log(`➕ Cambio añadido: ${type}.${action}`);
        
        // Intentar sincronizar inmediatamente si hay conexión
        if (navigator.onLine && window.supabase) {
            setTimeout(() => this.syncPendingChanges(), 1000);
        }
    },
    
    savePendingChanges() {
        localStorage.setItem('pending_sync_changes', JSON.stringify(this.pendingChanges));
    },
    
    loadPendingChanges() {
        const saved = localStorage.getItem('pending_sync_changes');
        this.pendingChanges = saved ? JSON.parse(saved) : [];
        console.log(`📋 ${this.pendingChanges.length} cambios pendientes cargados`);
    },
    
    checkPendingChanges() {
        this.loadPendingChanges();
        
        if (this.pendingChanges.length > 0) {
            console.log(`⚠️ Hay ${this.pendingChanges.length} cambios pendientes de sincronización`);
            
            if (window.UIManager) {
                const alert = document.createElement('div');
                alert.className = 'alert alert-warning';
                alert.innerHTML = `
                    <i class="fas fa-sync-alt"></i>
                    Tienes ${this.pendingChanges.length} cambios pendientes de sincronizar.
                    <button class="btn btn-sm btn-primary ml-10" onclick="SyncManager.syncPendingChanges()">
                        Sincronizar ahora
                    </button>
                `;
                
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.insertBefore(alert, mainContent.firstChild);
                }
            }
        }
    },
    
    clearPendingChanges() {
        this.pendingChanges = [];
        this.savePendingChanges();
        console.log('🧹 Cambios pendientes eliminados');
    }
};

// Exportar
window.SyncManager = SyncManager;
