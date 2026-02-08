const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();

// 1. CONFIGURACIÓN DE PUERTO (Vital para Render)
// Usar 0.0.0.0 ayuda a que Render detecte el puerto más rápido
const PORT = process.env.PORT || 10000;

// 2. PERMITIR RECIBIR DATOS PESADOS (VIDEO)
app.use(express.raw({ type: () => true, limit: '100mb' }));

// 3. CONEXIÓN SEGURA A SUPABASE
// Usamos variables de entorno (process.env) para que no falle al iniciar
const supabaseUrl = process.env.SUPABASE_URL || "https://hetdxozttqcuwhpuzktk.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2bmZ5cmtwZnZsb25sZmtoYmtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA3NzAxOCwiZXhwIjoyMDg1NjUzMDE4fQ.Nnl0GLX_6NCP1Pe8pnOgFVnQouldk3_oaCXzeFOgw6Q";
const supabase = createClient(supabaseUrl, supabaseKey);

// 4. RUTA DASHBOARD
app.get(['/', '/index.html'], (req, res) => {
    res.send("🛡️ SISTEMA ARGOS - DASHBOARD ONLINE");
});

// 5. RUTA PARA EL VIDEO (La que el ESP32 busca)
app.post('/receptor', async (req, res) => {
    console.log("🔔 [SISTEMA] ¡Petición recibida desde el microcontrolador!");
    
    // Aquí recibes el nombre del archivo que manda el ESP32 en el Header
    const fileName = req.headers['x-file-name'] || `video_${Date.now()}.avi`;
    const videoData = req.body;

    if (!videoData || videoData.length === 0) {
        console.error("❌ Error: No se recibieron datos de video.");
        return res.status(400).send("Cuerpo vacío");
    }

    try {
        console.log(`📦 Procesando video: ${fileName} (${videoData.length} bytes)`);
        
        // Subida al Storage de Supabase
        const { data, error } = await supabase.storage
            .from('videos_universitarios') // ASEGÚRATE DE QUE ESTE BUCKET EXISTA
            .upload(fileName, videoData, {
                contentType: 'video/avi',
                upsert: true
            });

        if (error) throw error;

        console.log("✅ Video guardado en Supabase Storage.");
        res.status(200).send("RECIBIDO Y GUARDADO");

    } catch (err) {
        console.error("❌ Error en el servidor:", err.message);
        res.status(500).send("Error interno: " + err.message);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor ARGOS activo en puerto ${PORT}`);
});
