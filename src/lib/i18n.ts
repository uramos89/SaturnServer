// ── Saturn Internationalization System ──────────────────────────────────
export type Language = 'en' | 'es';

const translations: Record<Language, Record<string, string>> = {
  en: {
    'app.name': 'SATURN',
    'app.tagline': 'Autonomous Infrastructure Platform',
    'app.subtitle': 'Powered by Ares Neural Engine & ContextP Memory',
    'neural.version': 'ARES 1.0.0',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.servers': 'Managed Nodes',
    'nav.knowledge': 'Knowledge Base',
    'nav.audit': 'Audit Trail',
    'nav.settings': 'Settings',
    'nav.infrastructure': 'Infrastructure',
    'nav.neural': 'Neural ContextP',
    
    // Status
    'status.system': 'System Status',
    'status.stable': 'STABLE',
    'status.healthy': 'Healthy',
    'status.degraded': 'Degraded',
    'status.critical': 'Critical',
    
    // Cards
    'card.health': 'System Health',
    'card.connections': 'Active Connections',
    'card.incidents': 'Incidents 24h',
    'card.memory': 'ContextP Memory',
    
    // Servers
    'server.cpu': 'CPU LOAD',
    'server.mem': 'RAM UTIL',
    'server.connect': 'Connect',
    'server.disconnect': 'Disconnect',
    'server.ssh.connect': 'New SSH Connection',
    'server.ssh.host': 'Host / IP',
    'server.ssh.port': 'Port',
    'server.ssh.user': 'Username',
    'server.ssh.auth': 'Auth Method',
    'server.ssh.password': 'Password',
    'server.ssh.key': 'SSH Key',
    'server.ssh.metrics': 'Live Metrics',
    'server.ssh.exec': 'Execute Command',
    'server.ssh.script': 'Run Script',
    
    // Incidents
    'incident.title': 'Active Incidents',
    'incident.none': 'No anomalies detected.',
    'incident.analyze': 'Deep Analysis',
    'incident.open': 'Open',
    'incident.closed': 'Resolved',
    
    // OBPA
    'obpa.title': 'Ares Neural Cycle // OBPA-v4',
    'obpa.observe': 'Infrastructure Monitoring',
    'obpa.propose': 'ContextP Pattern Matching',
    'obpa.execute': 'Remediation Synthesis',
    'obpa.approve': 'Manual Approval',
    'obpa.bitacora': 'Contractual Validation',
    'obpa.consolidate': 'Knowledge Persistence',
    'obpa.waiting': 'Waiting for administrative approval to proceed with execution.',
    'obpa.approved': 'Execution approved. Applying script...',
    'obpa.rejected': 'Execution rejected. Incident remains open.',
    'obpa.finalized': 'Cycle finalized successfully. Knowledge consolidated.',
    'obpa.action': 'Action Required',
    'obpa.confirm': 'Confirm & Execute',
    'obpa.reject': 'Reject',
    
    // Settings
    'settings.title': 'System Configuration',
    'settings.language': 'Interface Language',
    'settings.language.desc': 'Select the display language for the platform.',
    'settings.ai': 'AI Provider Configuration',
    'settings.ai.desc': 'Configure the neural engine provider. Without a valid API key, the OBPA cycle will operate in monitor-only mode.',
    'settings.ai.provider': 'Provider',
    'settings.ai.key': 'API Key',
    'settings.ai.save': 'Save Configuration',
    'settings.ai.saved': 'Configuration saved successfully.',
    'settings.ai.mode': 'Neural Engine Mode',
    'settings.ai.deep': 'Deep-Verify Mode',
    'settings.ai.deep.desc': 'Manual approval required for all OBPA cycles.',
    'settings.ai.auto': 'Auto-Remediate (Alpha)',
    'settings.ai.auto.desc': 'Autonomous resolution for low-severity incidents.',
    'settings.notifications': 'Notification Pipeline',
    'settings.notifications.desc': 'Configure alert delivery channels.',
    'settings.notifications.type': 'Adapter Type',
    'settings.notifications.dest': 'Destination Endpoint',
    'settings.notifications.init': 'Initialize Adapter',
    'settings.notifications.active': 'Active Notifications',
    'settings.notifications.none': 'No notification adapters configured.',
    
    // Knowledge Base
    'knowledge.title': 'NEURAL_METADATA_VISOR // CONTEXTP',
    'knowledge.empty': 'Recursive index empty.',
    'knowledge.synced': 'SYNCED',
    'knowledge.contracts': 'CONTRACTS',
    'knowledge.tech': 'TECH',
    'knowledge.func': 'FUNC',
    'knowledge.struct': 'STRUCT',
    'knowledge.audit': 'AUDIT',
    
    // Audit
    'audit.title': 'Comprehensive Audit Trail // Level-4',
    'audit.export': 'Export CSV',
    'audit.purge': 'Purge Logs',
    'audit.timestamp': 'Timestamp',
    'audit.origin': 'Origin',
    'audit.event': 'Event',
    'audit.detail': 'Detail',
    
    // Search
    'search.placeholder': 'DeepSearch managed nodes...',
    
    // Metrics
    'metrics.latency': 'Global System Latency p99',
    'metrics.nodes': 'Critical Infrastructure Nodes',
    
    // Footer
    'footer.goroutines': 'GOROUTINES',
    'footer.storage': 'STORAGE: SQLITE/WAL',
    'footer.recursion': 'RECURSION: OBPA-v4',
    'footer.replication': 'NODE POOL REPLICATION SUCCESSFUL',
    
    // Buttons
    'button.simulate': 'Simulate Incident',
    'button.refresh': 'Refresh',
    'button.save': 'Save',
    'button.cancel': 'Cancel',
    
    // Provider names
    'provider.gemini': 'Google Gemini',
    'provider.openai': 'OpenAI',
    'provider.ollama': 'Ollama (Local)',
    'provider.anthropic': 'Anthropic Claude',
    'provider.none': 'None (Monitor Only)',
    
    // Onboarding
    'onboarding.subtitle': 'Configure your AI provider to activate the Ares Neural Engine. Select from 35+ providers and 200+ models.',
    'onboarding.select': 'Select AI Provider',
    'onboarding.select.desc': 'Choose your preferred AI provider from the list below. You can change this later in Settings.',
    'onboarding.configured': 'Configured',
    'onboarding.next': 'Next Step',
    'onboarding.back': 'Back',
    'onboarding.model': 'Select Model',
    'onboarding.apiKey': 'API Key',
    'onboarding.apiKey.placeholder': 'Enter your API key...',
    'onboarding.apiKey.desc': 'Your API key is stored encrypted and never shared.',
    'onboarding.endpoint': 'Endpoint URL',
    'onboarding.saving': 'Configuring...',
    'onboarding.start': 'Initialize Saturn',
    'onboarding.ready': 'Saturn is Ready',
    'onboarding.ready.desc': 'Neural engine initialized. Redirecting to dashboard...',
    
    // Admin User
    'admin.create': 'Create Admin Account',
    'admin.create.desc': 'Set up your administrator credentials to secure the platform.',
    'admin.username': 'Username',
    'admin.password': 'Password',
    'admin.confirm': 'Confirm Password',
    'admin.create.btn': 'Create Account',
    'admin.error.match': 'Passwords do not match',
    'admin.error.short': 'Password must be at least 8 characters',
    'admin.success': 'Admin account created successfully',
    
    // SMTP Configuration
    'smtp.title': 'SMTP Email Configuration',
    'smtp.desc': 'Configure SMTP settings for email alerts and notifications.',
    'smtp.host': 'SMTP Host',
    'smtp.port': 'SMTP Port',
    'smtp.user': 'SMTP Username',
    'smtp.pass': 'SMTP Password',
    'smtp.from': 'From Email',
    'smtp.to': 'Alert Recipient Email',
    'smtp.secure': 'Use TLS/SSL',
    'smtp.test': 'Test Connection',
    'smtp.save': 'Save SMTP Config',
    'smtp.saved': 'SMTP configuration saved',
    'smtp.test.success': 'Test email sent successfully',
    'smtp.test.fail': 'Failed to send test email',
    
    // Settings model display
    'settings.ai.model': 'Selected Model',
    'settings.ai.model.none': 'No model selected',
    'settings.ai.provider.name': 'Provider Name',
  },

  es: {
    'app.name': 'SATURN',
    'app.tagline': 'Plataforma Autónoma de Infraestructura',
    'app.subtitle': 'Impulsado por Ares Neural Engine y ContextP Memory',
    'neural.version': 'ARES 1.0.0',
    
    // Navigation
    'nav.dashboard': 'Panel Principal',
    'nav.servers': 'Nodos Gestionados',
    'nav.knowledge': 'Base de Conocimiento',
    'nav.audit': 'Traza de Auditoría',
    'nav.settings': 'Configuración',
    'nav.infrastructure': 'Infraestructura',
    'nav.neural': 'ContextP Neural',
    
    // Status
    'status.system': 'Estado del Sistema',
    'status.stable': 'ESTABLE',
    'status.healthy': 'Saludable',
    'status.degraded': 'Degradado',
    'status.critical': 'Crítico',
    
    // Cards
    'card.health': 'Salud del Sistema',
    'card.connections': 'Conexiones Activas',
    'card.incidents': 'Incidentes 24h',
    'card.memory': 'Memoria ContextP',
    
    // Servers
    'server.cpu': 'CPU',
    'server.mem': 'RAM',
    'server.connect': 'Conectar',
    'server.disconnect': 'Desconectar',
    'server.ssh.connect': 'Nueva Conexión SSH',
    'server.ssh.host': 'Host / IP',
    'server.ssh.port': 'Puerto',
    'server.ssh.user': 'Usuario',
    'server.ssh.auth': 'Método de Autenticación',
    'server.ssh.password': 'Contraseña',
    'server.ssh.key': 'Llave SSH',
    'server.ssh.metrics': 'Métricas en Vivo',
    'server.ssh.exec': 'Ejecutar Comando',
    'server.ssh.script': 'Ejecutar Script',
    
    // Incidents
    'incident.title': 'Incidentes Activos',
    'incident.none': 'No se detectaron anomalías.',
    'incident.analyze': 'Análisis Profundo',
    'incident.open': 'Abierto',
    'incident.closed': 'Resuelto',
    
    // OBPA
    'obpa.title': 'Ciclo Neural Ares // OBPA-v4',
    'obpa.observe': 'Monitoreo de Infraestructura',
    'obpa.propose': 'Coincidencia de Patrones ContextP',
    'obpa.execute': 'Síntesis de Remedición',
    'obpa.approve': 'Aprobación Manual',
    'obpa.bitacora': 'Validación Contractual',
    'obpa.consolidate': 'Persistencia de Conocimiento',
    'obpa.waiting': 'Esperando aprobación administrativa para proceder con la ejecución.',
    'obpa.approved': 'Ejecución aprobada. Aplicando script...',
    'obpa.rejected': 'Ejecución rechazada. El incidente permanece abierto.',
    'obpa.finalized': 'Ciclo finalizado exitosamente. Conocimiento consolidado.',
    'obpa.action': 'Acción Requerida',
    'obpa.confirm': 'Confirmar y Ejecutar',
    'obpa.reject': 'Rechazar',
    
    // Settings
    'settings.title': 'Configuración del Sistema',
    'settings.language': 'Idioma de Interfaz',
    'settings.language.desc': 'Selecciona el idioma de visualización de la plataforma.',
    'settings.ai': 'Configuración del Proveedor IA',
    'settings.ai.desc': 'Configura el proveedor del motor neural. Sin una API key válida, el ciclo OBPA operará en modo solo monitoreo.',
    'settings.ai.provider': 'Proveedor',
    'settings.ai.key': 'API Key',
    'settings.ai.save': 'Guardar Configuración',
    'settings.ai.saved': 'Configuración guardada exitosamente.',
    'settings.ai.mode': 'Modo del Motor Neural',
    'settings.ai.deep': 'Modo Deep-Verify',
    'settings.ai.deep.desc': 'Se requiere aprobación manual para todos los ciclos OBPA.',
    'settings.ai.auto': 'Auto-Remediación (Alpha)',
    'settings.ai.auto.desc': 'Resolución autónoma para incidentes de baja severidad.',
    'settings.notifications': 'Pipeline de Notificaciones',
    'settings.notifications.desc': 'Configura los canales de entrega de alertas.',
    'settings.notifications.type': 'Tipo de Adaptador',
    'settings.notifications.dest': 'Destino',
    'settings.notifications.init': 'Inicializar Adaptador',
    'settings.notifications.active': 'Notificaciones Activas',
    'settings.notifications.none': 'No hay adaptadores de notificación configurados.',
    
    // Knowledge Base
    'knowledge.title': 'VISOR DE METADATOS NEURALES // CONTEXTP',
    'knowledge.empty': 'Índice recursivo vacío.',
    'knowledge.synced': 'SINCRONIZADO',
    'knowledge.contracts': 'CONTRATOS',
    'knowledge.tech': 'TECNOLOGÍA',
    'knowledge.func': 'FUNCIONAL',
    'knowledge.struct': 'ESTRUCTURAL',
    'knowledge.audit': 'AUDITORÍA',
    
    // Audit
    'audit.title': 'Traza de Auditoría Integral // Nivel-4',
    'audit.export': 'Exportar CSV',
    'audit.purge': 'Purgar Logs',
    'audit.timestamp': 'Marca de Tiempo',
    'audit.origin': 'Origen',
    'audit.event': 'Evento',
    'audit.detail': 'Detalle',
    
    // Search
    'search.placeholder': 'Búsqueda profunda en nodos gestionados...',
    
    // Metrics
    'metrics.latency': 'Latencia Global del Sistema p99',
    'metrics.nodes': 'Nodos Críticos de Infraestructura',
    
    // Footer
    'footer.goroutines': 'GORUTINAS',
    'footer.storage': 'ALMACENAMIENTO: SQLITE/WAL',
    'footer.recursion': 'RECURSIÓN: OBPA-v4',
    'footer.replication': 'REPLICACIÓN DEL POOL DE NODOS EXITOSA',
    
    // Buttons
    'button.simulate': 'Simular Incidente',
    'button.refresh': 'Actualizar',
    'button.save': 'Guardar',
    'button.cancel': 'Cancelar',
    
    // Provider names
    'provider.gemini': 'Google Gemini',
    'provider.openai': 'OpenAI',
    'provider.ollama': 'Ollama (Local)',
    'provider.anthropic': 'Anthropic Claude',
    'provider.none': 'Ninguno (Solo Monitoreo)',
    
    // Onboarding
    'onboarding.subtitle': 'Configura tu proveedor de IA para activar el Motor Neural Ares. Selecciona entre 35+ proveedores y 200+ modelos.',
    'onboarding.select': 'Selecciona Proveedor IA',
    'onboarding.select.desc': 'Elige tu proveedor de IA preferido de la lista. Puedes cambiarlo después en Configuración.',
    'onboarding.configured': 'Configurado',
    'onboarding.next': 'Siguiente',
    'onboarding.back': 'Atrás',
    'onboarding.model': 'Selecciona Modelo',
    'onboarding.apiKey': 'API Key',
    'onboarding.apiKey.placeholder': 'Ingresa tu API key...',
    'onboarding.apiKey.desc': 'Tu API key se almacena encriptada y nunca se comparte.',
    'onboarding.endpoint': 'URL del Endpoint',
    'onboarding.saving': 'Configurando...',
    'onboarding.start': 'Inicializar Saturn',
    'onboarding.ready': 'Saturn está Listo',
    'onboarding.ready.desc': 'Motor neural inicializado. Redirigiendo al dashboard...',
    
    // Admin User
    'admin.create': 'Crear Cuenta Admin',
    'admin.create.desc': 'Configura tus credenciales de administrador para asegurar la plataforma.',
    'admin.username': 'Usuario',
    'admin.password': 'Contraseña',
    'admin.confirm': 'Confirmar Contraseña',
    'admin.create.btn': 'Crear Cuenta',
    'admin.error.match': 'Las contraseñas no coinciden',
    'admin.error.short': 'La contraseña debe tener al menos 8 caracteres',
    'admin.success': 'Cuenta de administrador creada exitosamente',
    
    // SMTP Configuration
    'smtp.title': 'Configuración SMTP de Correo',
    'smtp.desc': 'Configura los ajustes SMTP para alertas y notificaciones por correo.',
    'smtp.host': 'Servidor SMTP',
    'smtp.port': 'Puerto SMTP',
    'smtp.user': 'Usuario SMTP',
    'smtp.pass': 'Contraseña SMTP',
    'smtp.from': 'Correo Remitente',
    'smtp.to': 'Correo Destinatario de Alertas',
    'smtp.secure': 'Usar TLS/SSL',
    'smtp.test': 'Probar Conexión',
    'smtp.save': 'Guardar Config SMTP',
    'smtp.saved': 'Configuración SMTP guardada',
    'smtp.test.success': 'Correo de prueba enviado exitosamente',
    'smtp.test.fail': 'Error al enviar correo de prueba',
    
    // Settings model display
    'settings.ai.model': 'Modelo Seleccionado',
    'settings.ai.model.none': 'Ningún modelo seleccionado',
    'settings.ai.provider.name': 'Nombre del Proveedor',
  }
};

export function t(key: string, lang: Language): string {
  return translations[lang]?.[key] || translations['en']?.[key] || key;
}
