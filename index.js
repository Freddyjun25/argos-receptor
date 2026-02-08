const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path'); // Vital para cargar el HTML
const app = express();

const PORT = process.env.PORT || 10000;

// 1. PERMITIR RECIBIR VIDEOS PESADOS
app.use(express.raw({ type: () => true, limit: '100mb' }));

// 2. CONEXIÓN A SUPABASE (Asegúrate de poner tus datos reales aquí)
const supabase = createClient("https://hetdxozttqcuwhpuzktk.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2bmZ5cmtwZnZsb25sZmtoYmtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA3NzAxOCwiZXhwIjoyMDg1NjUzMDE4fQ.Nnl0GLX_6NCP1Pe8pnOgFVnQouldk3_oaCXzeFOgw6Q");

// 3. CARGAR TUS ARCHIVOS VISUALES (HTML, CSS, JS)
// Esto hará que https://argos-sistema-institucional.onrender.com/ vuelva a ser tu página
app.use(express.static(path.join(__dirname, '.')));

// 4. RUTA DEL DASHBOARD (Para que no salga solo el texto blanco)
app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 5. RUTA DEL RECEPTOR (Para que el Arduino NO dé error 404)
app.post('/receptor', async (req, res) => {
    console.log("🔔 ¡LLEGÓ UN VIDEO!");
    const fileName = req.headers['x-file-name'] || `video_${Date.now()}.avi`;
    
    try {
        const { data, error } = await supabase.storage
            .from('videos_universitarios') // Nombre de tu bucket en Supabase
            .upload(fileName, req.body, {
                contentType: 'video/avi',
                upsert: true
            });

        if (error) throw error;
        console.log("✅ Video guardado en Supabase");
        res.status(200).send("RECIBIDO Y GUARDADO");
    } catch (err) {
        console.error("❌ Error:", err.message);
        res.status(500).send("Error interno");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor en línea en puerto ${PORT}`);
});
