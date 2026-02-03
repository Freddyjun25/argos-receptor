const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const app = express();

// Configuración para recibir videos de hasta 100MB
app.use(express.raw({ type: 'video/mp4', limit: '100mb' }));

// Servir la carpeta "public" para la interfaz visual
app.use(express.static(path.join(__dirname, 'public')));

// Conexión con Supabase usando variables de entorno de Render
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Ruta para ver la página web principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para que la cámara suba los videos
app.post('/upload', async (req, res) => {
    const fileName = `ARGOS_${Date.now()}.mp4`;
    try {
        // 1. Subir video al Storage de Supabase
        const { error: storageError } = await supabase.storage
            .from('videos-receptor')
            .upload(fileName, req.body, { contentType: 'video/mp4', upsert: true });

        if (storageError) throw storageError;

        // 2. Obtener el enlace público del video
        const { data: urlData } = supabase.storage.from('videos-receptor').getPublicUrl(fileName);

        // 3. Registrar la evidencia en la base de datos
        const { error: dbError } = await supabase.from('alertas').insert([{ 
            nombre_archivo: fileName, 
            url_video: urlData.publicUrl,
            fecha: new Date(),
            estado: 'Revisión Pendiente'
        }]);

        if (dbError) throw dbError;

        console.log(`✅ Evidencia guardada: ${fileName}`);
        res.status(200).send('Archivado Exitoso');
    } catch (err) {
        console.error('❌ Error:', err.message);
        res.status(500).send(err.message);
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🛡️ Servidor Argos Activo en puerto ${PORT}`));
