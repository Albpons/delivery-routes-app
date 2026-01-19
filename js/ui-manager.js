// Gestión de la interfaz de usuario
const UIManager = {
    currentSection: 'dashboard',
    
    // Inicializar
    init() {
        this.setupNavigation();
        this.setupMobileMenu();
        this.updateStats();
        
        // Mostrar sección actual
        this.showSection(this.currentSection);
    },
    
    // Configurar navegación
    setupNavigation() {
        // Navegación admin
        const navItems = document.querySelectorAll('#adminApp .nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.showSection(section);
            });
        });
        
        // Navegación repartidor (bottom nav)
        const driverNavBtns = document.querySelectorAll('#driverApp .nav-btn');
        driverNavBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.onclick.toString().match(/showDriverSection\('([^']+)'\)/)[1];
                this.showDriverSection(section);
            });
        });
    },
    
    // Configurar menú móvil
    setupMobileMenu() {
        const menuToggle = document.querySelector('.menu-toggle');
        const sidebar = document.getElementById('sidebar');
        
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
            
            // Cerrar menú al hacer clic fuera en móvil
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 1024) {
                    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                        sidebar.classList.remove('active');
                    }
                }
            });
        }
    },
    
    // Mostrar sección (admin)
    showSection(sectionId) {
        // Ocultar todas las secciones
        const sections = document.querySelectorAll('#adminApp .content-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Mostrar sección seleccionada
        const targetSection = document.getElementById(sectionId + 'Section');
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Actualizar navegación
        const navItems = document.querySelectorAll('#adminApp .nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === sectionId) {
                item.classList.add('active');
            }
        });
        
        // Actualizar título si es necesario
        this.updatePageTitle(sectionId);
        
        // Cerrar menú móvil si está abierto
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
        
        this.currentSection = sectionId;
    },
    
    // Mostrar sección (repartidor)
    showDriverSection(sectionId) {
        // Ocultar todas las secciones
        const sections = document.querySelectorAll('#driverApp .driver-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Mostrar sección seleccionada
        const targetSection = document.getElementById('driver' + this.capitalize(sectionId) + 'Section');
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Actualizar navegación inferior
        const navBtns = document.querySelectorAll('#driverApp .nav-btn');
        navBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.onclick.toString().includes(`'${sectionId}'`)) {
                btn.classList.add('active');
            }
        });
    },
    
    // Capitalizar texto
    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    },
    
    // Actualizar título de página
    updatePageTitle(sectionId) {
        const titles = {
            'dashboard': 'Dashboard',
            'csv-upload': 'Carga CSV',
            'routes': 'Rutas',
            'deliveries': 'Entregas',
            'drivers': 'Repartidores',
            'reports': 'Reportes',
            'settings': 'Configuración'
        };
        
        const title = titles[sectionId] || 'Delivery Pro';
        document.title = `${title} - Delivery Pro`;
    },
    
    // Actualizar estadísticas
    updateStats(stats = null) {
        if (!stats) {
            stats = DataManager.getStats();
        }
        
        // Actualizar elementos del dashboard
        const elements = {
            'totalRoutes': stats.totalRoutes,
            'totalDeliveries': stats.totalDeliveries,
            'activeDrivers': stats.activeDrivers,
            'completedDeliveries': stats.completedToday
        };
        
        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        }
    },
    
    // Mostrar/ocultar sidebar
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('active');
        }
    },
    
    // Actualizar actividad reciente
    updateActivityLog() {
        const activityLog = document.getElementById('activityLog');
        if (!activityLog) return;
        
        const deliveries = DataManager.cache.deliveries;
        const recentDeliveries = deliveries.slice(0, 5); // Últimas 5 entregas
        
        if (recentDeliveries.length === 0) {
            activityLog.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-history fa-2x text-muted mb-2"></i>
                    <p class="text-muted">No hay actividad reciente</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        recentDeliveries.forEach(delivery => {
            const timeAgo = this.getTimeAgo(delivery.created_at);
            let icon = '⏳';
            let color = 'warning';
            
            switch(delivery.status) {
                case 'completed':
                    icon = '✅';
                    color = 'success';
                    break;
                case 'in_progress':
                    icon = '🚚';
                    color = 'primary';
                    break;
            }
            
            html += `
                <div class="activity-item">
                    <div class="activity-icon bg-${color}-light text-${color}">
                        <i class="fas fa-${delivery.status === 'completed' ? 'check-circle' : 
                                           delivery.status === 'in_progress' ? 'truck' : 
                                           'clock'}"></i>
                    </div>
                    <div class="activity-content">
                        <strong>${delivery.client || 'Cliente'}</strong>
                        <p class="text-sm text-muted">${delivery.address || ''}</p>
                    </div>
                    <div class="activity-time">
                        <span class="text-xs text-muted">${timeAgo}</span>
                    </div>
                </div>
            `;
        });
        
        activityLog.innerHTML = html;
    },
    
    // Calcular tiempo transcurrido
    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'ahora mismo';
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `hace ${minutes} min`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `hace ${hours} h`;
        
        const days = Math.floor(hours / 24);
        if (days < 7) return `hace ${days} d`;
        
        return date.toLocaleDateString('es-ES');
    },
    
    // Mostrar información del sistema
    showSystemInfo() {
        const stats = DataManager.getStats();
        const isOnline = DataManager.isOnline;
        const lastSync = DataManager.cache.lastSync 
            ? new Date(DataManager.cache.lastSync).toLocaleString('es-ES')
            : 'Nunca';
        
        const info = `
            <div class="system-info">
                <h4><i class="fas fa-info-circle"></i> Información del Sistema</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>Estado:</strong>
                        <span class="badge badge-${isOnline ? 'success' : 'warning'}">
                            ${isOnline ? '🟢 Conectado' : '⚠️ Offline'}
                        </span>
                    </div>
                    <div class="info-item">
                        <strong>Última sincronización:</strong>
                        <span>${lastSync}</span>
                    </div>
                    <div class="info-item">
                        <strong>Repartidores activos:</strong>
                        <span>${stats.activeDrivers}</span>
                    </div>
                    <div class="info-item">
                        <strong>Rutas activas:</strong>
                        <span>${stats.activeRoutes}</span>
                    </div>
                    <div class="info-item">
                        <strong>Entregas totales:</strong>
                        <span>${stats.totalDeliveries}</span>
                    </div>
                    <div class="info-item">
                        <strong>Entregas pendientes:</strong>
                        <span>${stats.pendingDeliveries}</span>
                    </div>
                </div>
                
                <div class="mt-3">
                    <button class="btn btn-primary" onclick="refreshData()">
                        <i class="fas fa-sync-alt"></i> Actualizar datos
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal').classList.remove('active')">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        
        // Crear modal temporal
        this.showModal('Información del Sistema', info);
    },
    
    // Mostrar modal
    showModal(title, content) {
        const modalId = 'tempModal';
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close" onclick="document.getElementById('${modalId}').classList.remove('active')">
                            &times;
                        </button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            modal.querySelector('.modal-header h3').textContent = title;
            modal.querySelector('.modal-body').innerHTML = content;
        }
        
        modal.classList.add('active');
    },
    
    // Inicializar funcionalidades de comanda
    initOrderFunctionality() {
        // Expandir/contraer comandas
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('order-toggle')) {
                const preview = e.target.closest('.order-preview');
                if (preview) {
                    preview.classList.toggle('expanded');
                    e.target.textContent = preview.classList.contains('expanded') ? 'Ver menos' : 'Ver más';
                }
            }
        });
    }
};

// Funciones globales
window.showSection = function(sectionId) {
    UIManager.showSection(sectionId);
};

window.showDriverSection = function(sectionId) {
    UIManager.showDriverSection(sectionId);
};

window.toggleSidebar = function() {
    UIManager.toggleSidebar();
};

window.showSystemInfo = function() {
    UIManager.showSystemInfo();
};

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', function() {
    UIManager.init();
    UIManager.initOrderFunctionality();
});

// Exportar para uso global
window.UIManager = UIManager;
