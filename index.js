const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const app = express();

// 1. CONFIGURACIÓN ULTRA-FLEXIBLE
app.use(express.raw({ 
    type: () => true, 
    limit: '100mb' 
}));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// CONEXIÓN CON SUPABASE
const supabase = createClient(
    "https://evnfyrkpfvlonlfkhbkr.supabase.co", 
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2bmZ5cmtwZnZsb25sZmtoYmtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA3NzAxOCwiZXhwIjoyMDg1NjUzMDE4fQ.Nnl0GLX_6NCP1Pe8pnOgFVnQouldk3_oaCXzeFOgw6Q"
);

// --- PRUEBA DE VIDA Y DESPERTADOR ---
app.get('/', (req, res) => {
    console.log("⏰ [SISTEMA] El ESP32 ha despertado al servidor.");
    
    // Si existe el archivo index.html lo envía, si no, envía un mensaje de texto
    const indexPath = path.join(__dirname, 'public', 'index.html');
    res.status(200).send("🛡️ SERVIDOR ARGOS ONLINE - ESPERANDO SEÑAL");
});

// 2. RUTA DE RECEPCIÓN
app.post(['/receptor', '/receptor/'], async (req, res) => {
    console.log("-----------------------------------------");
    console.log("🔔 ¡CONEXIÓN DETECTADA DESDE EL ESP32!");
    
    if (!req.body || req.body.length === 0) {
        console.error("⚠️ El cuerpo de la petición está vacío.");
        return res.status(400).send("No hay datos de video");
    }

    const fileName = `ARGOS_${Date.now()}.avi`; 
    
    try {
        console.log(`📥 Procesando video: ${fileName} (${req.body.length} bytes)`);

        const { error: storageError } = await supabase.storage
            .from('videos-receptor')
            .upload(fileName, req.body, { 
                contentType: 'video/x-msvideo', 
                upsert: true 
            });

        if (storageError) throw storageError;

        const { data: urlData } = supabase.storage.from('videos-receptor').getPublicUrl(fileName);

        const { error: dbError } = await supabase.from('alertas').insert([{ 
            nombre_archivo: fileName, 
            url_video: urlData.publicUrl,
            fecha: new Date(),
            estado: 'Revisión Pendiente'
        }]);

        if (dbError) throw dbError;

        console.log(`✅ EXITO: ${fileName} guardado en Supabase.`);
        console.log("-----------------------------------------");
        res.status(200).send('RECIBIDO POR ARGOS V2');
        
    } catch (err) {
        console.error('❌ ERROR CRÍTICO:', err.message);
        res.status(500).send(`Error: ${err.message}`);
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log("=========================================");
    console.log(`🛡️  SERVIDOR ARGOS ACTIVO EN PUERTO ${PORT}`);
    console.log(`🔗 RUTA DE ESCUCHA: /receptor`);
    console.log("=========================================");
});
