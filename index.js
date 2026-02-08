const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const app = express();

// 1. CONFIGURACIÓN DE PUERTO (Vital para Render)
const PORT = process.env.PORT || 10000;

// 2. MIDDLEWARE PARA VIDEO: Permite recibir datos pesados del ESP32
app.use(express.raw({ type: () => true, limit: '100mb' }));

// 3. CONEXIÓN SEGURA A SUPABASE (Usando tus variables de Render)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 4. SERVIR ARCHIVOS ESTÁTICOS: Le decimos que busque en la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// 5. RUTA DEL DASHBOARD: Carga tu index.html desde la carpeta public
app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
        if (err) {
            console.error("❌ No se encontró el HTML en /public/index.html");
            res.status(404).send("Error: Interfaz no encontrada en la carpeta public.");
        }
    });
});

// 6. RUTA DEL RECEPTOR: Donde el ESP32 envía los videos
app.post('/receptor', async (req, res) => {
    console.log("🔔 [SISTEMA] ¡Video entrante detectado!");
    
    const fileName = req.headers['x-file-name'] || `video_${Date.now()}.avi`;
    
    try {
        const { data, error } = await supabase.storage
            .from('videos_universitarios') // Verifica que este nombre sea igual en Supabase
            .upload(fileName, req.body, {
                contentType: 'video/avi',
                upsert: true
            });

        if (error) throw error;
        
        console.log(`✅ Video ${fileName} guardado con éxito.`);
        res.status(200).send("SUBIDA_EXITOSA");

    } catch (err) {
        console.error("❌ Error en la subida:", err.message);
        res.status(500).send("Error interno");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor ARGOS CORE activo y escuchando en puerto ${PORT}`);
});
