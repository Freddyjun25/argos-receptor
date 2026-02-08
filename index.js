const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000;

// 1. REPARACIÓN CRÍTICA PARA EL 404: Definir el receptor ANTES que el contenido estático
app.use(express.raw({ type: () => true, limit: '100mb' }));

// 2. CONEXIÓN (Variables de entorno de Render)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 3. LA RUTA DEL VIDEO (Muévela aquí arriba)
app.post('/receptor', async (req, res) => {
    console.log("🔔 [SISTEMA] ¡Llegó un video del ESP32!");
    const fileName = req.headers['x-file-name'] || `video_${Date.now()}.avi`;
    
    try {
        const { data, error } = await supabase.storage
            .from('videos_universitarios')
            .upload(fileName, req.body, { contentType: 'video/avi', upsert: true });

        if (error) throw error;
        console.log("✅ Guardado en Supabase");
        res.status(200).send("OK");
    } catch (err) {
        console.error("❌ Error subiendo:", err.message);
        res.status(500).send("Error");
    }
});

// 4. DESPUÉS DE LA RUTA POST, DEFINIMOS LA WEB
app.use(express.static(path.join(__dirname, 'public')));

app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor activo en puerto ${PORT}`);
});
