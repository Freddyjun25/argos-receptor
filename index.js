const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000;

// Configuración de Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// LOG DE CONTROL: Para ver en Render qué está llegando
app.use((req, res, next) => {
    console.log(`🔍 [LOG] Petición entrante: ${req.method} ${req.url}`);
    next();
});

// RUTA DEL RECEPTOR (Específica para el binario)
app.post('/receptor', express.raw({ type: 'application/octet-stream', limit: '50mb' }), async (req, res) => {
    console.log("📥 [SISTEMA] Recibiendo video...");
    const fileName = req.headers['x-file-name'] || `video_${Date.now()}.avi`;

    try {
        const { data, error } = await supabase.storage
            .from('videos_receptor') 
            .upload(fileName, req.body, {
                contentType: 'video/avi',
                upsert: true
            });

        if (error) {
            console.error("❌ ERROR DE SUPABASE:", error.message);
            return res.status(500).send(error.message);
        }

        console.log("✅ [EXITO] Video guardado:", fileName);
        res.status(200).send("OK_GUARDADO");
    } catch (err) {
        console.error("❌ ERROR CRÍTICO:", err.message);
        res.status(500).send(err.message);
    }
});

// Servir archivos estáticos DESPUÉS de las rutas API
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Argos activo en puerto ${PORT}`);
});
