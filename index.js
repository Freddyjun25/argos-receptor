const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const app = express();

// 1. PUERTO DINÁMICO PARA RENDER
const PORT = process.env.PORT || 10000;

// 2. MIDDLEWARE PARA RECIBIR BINARIOS (VIDEO .AVI)
app.use(express.raw({ type: () => true, limit: '100mb' }));

// 3. CONEXIÓN SEGURA USANDO TUS VARIABLES DE RENDER
// El servidor las toma directamente de la configuración que hiciste
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// 4. SERVIR ARCHIVOS ESTÁTICOS (CSS, Imágenes, JS del Dashboard)
app.use(express.static(path.join(__dirname, '.')));

// 5. RUTA PRINCIPAL: Muestra tu Dashboard Institucional
app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 6. RUTA DEL RECEPTOR: Procesa la subida del ESP32
app.post('/receptor', async (req, res) => {
    console.log("🔔 [ALERTA] Recibiendo paquete de video del ESP32...");

    const fileName = req.headers['x-file-name'] || `video_${Date.now()}.avi`;
    const videoData = req.body;

    if (!videoData || videoData.length === 0) {
        return res.status(400).send("Datos vacíos");
    }

    try {
        // Subida al Bucket de Supabase
        const { data, error } = await supabase.storage
            .from('videos_universitarios') // Revisa que este nombre sea igual en Supabase
            .upload(fileName, videoData, {
                contentType: 'video/avi',
                upsert: true
            });

        if (error) throw error;

        console.log(`✅ Éxito: ${fileName} guardado en el storage.`);
        res.status(200).send("VIDEO_GUARDADO_OK");

    } catch (err) {
        console.error("❌ Error en la subida:", err.message);
        res.status(500).send("Error interno: " + err.message);
    }
});

// 7. INICIO DEL SERVIDOR
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor ARGOS corriendo en puerto ${PORT}`);
});
