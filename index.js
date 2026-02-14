const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000;

// Configuración de Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 1. RUTA DE DIAGNÓSTICO (Para saber si el servidor vive)
app.get('/hola', (req, res) => {
    res.send("Servidor Argos vivo y operando");
});

// 2. EL RECEPTOR (POST) - Debe ir ANTES de las rutas estáticas
app.post('/receptor', express.raw({ type: 'application/octet-stream', limit: '50mb' }), async (req, res) => {
    console.log("📥 Recibiendo video desde el ESP32...");
    const fileName = req.headers['x-file-name'] || `video_${Date.now()}.avi`;

    try {
        const { data, error } = await supabase.storage
            .from('videos_receptor') 
            .upload(fileName, req.body, {
                contentType: 'video/avi',
                upsert: true
            });

        if (error) {
            console.error("❌ Error Supabase:", error.message);
            return res.status(500).send(error.message);
        }

        console.log("✅ Video guardado con éxito:", fileName);
        res.status(200).send("OK_GUARDADO");
    } catch (err) {
        console.error("❌ Error Crítico:", err.message);
        res.status(500).send(err.message);
    }
});

// 3. CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS (CORREGIDA)
// Esto le dice a Express que use la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// 4. RUTA PRINCIPAL (Para cargar el index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📂 Carpeta actual: ${__dirname}`);
});
