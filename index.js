const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();

// 1. CONFIGURACIÓN DE PUERTO (Vital para que Render detecte el servicio)
const PORT = process.env.PORT || 10000;

// 2. MIDDLEWARE PARA VIDEO: Permite recibir los datos binarios del .avi
app.use(express.raw({ type: () => true, limit: '100mb' }));

// 3. CONEXIÓN A SUPABASE
// NOTA: Reemplaza con tus credenciales o usa Variables de Entorno en Render
const supabaseUrl = 'https://hetdxozttqcuwhpuzktk.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2bmZ5cmtwZnZsb25sZmtoYmtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA3NzAxOCwiZXhwIjoyMDg1NjUzMDE4fQ.Nnl0GLX_6NCP1Pe8pnOgFVnQouldk3_oaCXzeFOgw6Q';
const supabase = createClient(supabaseUrl, supabaseKey);

// 4. RUTA PARA EL DASHBOARD (Keep-alive)
app.get(['/', '/index.html'], (req, res) => {
    res.send("🛡️ ARGOS CORE: DASHBOARD ONLINE - ESPERANDO SEÑAL DEL ESP32");
});

// 5. RUTA PARA EL VIDEO (La que el ESP32 busca como /receptor)
app.post('/receptor', async (req, res) => {
    console.log("🔔 [ALERTA] ¡LLEGÓ UN VIDEO AL SERVIDOR INSTITUCIONAL!");

    // Extraemos el nombre que envía el ESP32 en la cabecera 'X-File-Name'
    const fileName = req.headers['x-file-name'] || `video_${Date.now()}.avi`;
    const videoData = req.body;

    // Validación básica de datos
    if (!videoData || videoData.length === 0) {
        console.error("❌ Error: Cuerpo de petición vacío.");
        return res.status(400).send("Archivo vacío");
    }

    try {
        console.log(`📦 Procesando subida a Storage: ${fileName}...`);

        // Subida al Bucket de Supabase
        const { data, error } = await supabase.storage
            .from('videos_universitarios') // Asegúrate de que este nombre sea exacto en Supabase
            .upload(fileName, videoData, {
                contentType: 'video/avi',
                upsert: true
            });

        if (error) {
            console.error("❌ Error en Supabase Storage:", error.message);
            return res.status(500).send("Error en Storage");
        }

        console.log("✅ Video almacenado exitosamente en la nube.");
        res.status(200).send("RECIBIDO EN INSTITUCIONAL Y GUARDADO");

    } catch (err) {
        console.error("❌ Error crítico en el servidor:", err.message);
        res.status(500).send("Error interno del servidor");
    }
});

// 6. LANZAMIENTO DEL SERVIDOR
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Argos Receptor activo en puerto ${PORT}`);
});
