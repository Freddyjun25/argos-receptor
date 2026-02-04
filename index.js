const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const app = express();

// 1. Aceptamos cualquier tipo de archivo (incluyendo .avi) de hasta 100MB
app.use(express.raw({ type: '*/*', limit: '100mb' }));

// Servir la carpeta "public" para la interfaz visual
app.use(express.static(path.join(__dirname, 'public')));

// CONEXIÓN CON SUPABASE
const supabase = createClient(
    "https://evnfyrkpfvlonlfkhbkr.supabase.co", 
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2bmZ5cmtwZnZsb25sZmtoYmtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA3NzAxOCwiZXhwIjoyMDg1NjUzMDE4fQ.Nnl0GLX_6NCP1Pe8pnOgFVnQouldk3_oaCXzeFOgw6Q"
);

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. RUTA ACTUALIZADA PARA RECIBIR .AVI
app.post('/receptor', async (req, res) => {
    console.log("🔔 ¡Algo está intentando entrar por /receptor!"); // Esto nos dirá si el ESP32 toca la puerta
    const fileName = `ARGOS_${Date.now()}.avi`; 
    
    try {
        console.log(`📥 Recibiendo archivo: ${fileName}...`);

        // Subida a Supabase con el contentType correcto para video AVI
        const { error: storageError } = await supabase.storage
            .from('videos-receptor')
            .upload(fileName, req.body, { 
                contentType: 'video/x-msvideo', // MIME type estándar para AVI
                upsert: true 
            });

        if (storageError) throw storageError;

        // Obtener la URL pública del video
        const { data: urlData } = supabase.storage.from('videos-receptor').getPublicUrl(fileName);

        // Insertar registro en la base de datos
        const { error: dbError } = await supabase.from('alertas').insert([{ 
            nombre_archivo: fileName, 
            url_video: urlData.publicUrl,
            fecha: new Date(),
            estado: 'Revisión Pendiente'
        }]);

        if (dbError) throw dbError;

        console.log(`✅ Evidencia guardada con éxito: ${fileName}`);
        res.status(200).send('Archivado Exitoso');
        
    } catch (err) {
        console.error('❌ Error en el servidor:', err.message);
        res.status(500).send(`Error: ${err.message}`);
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🛡️ Servidor Argos Activo en puerto ${PORT}`));
