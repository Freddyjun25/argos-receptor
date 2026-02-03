const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const app = express();

// Configuración para recibir videos pesados
app.use(express.raw({ type: 'video/mp4', limit: '100mb' }));

// Servir la carpeta "public" donde estará tu página visual
app.use(express.static(path.join(__dirname, 'public')));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// RUTA PRINCIPAL: Muestra la página web
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// RUTA DE SUBIDA: Recibe el video de la cámara
app.post('/upload', async (req, res) => {
    const fileName = `ARGOS_EVIDENCIA_${Date.now()}.mp4`;
    try {
        const { error: storageError } = await supabase.storage
            .from('videos-receptor')
            .upload(fileName, req.body, { contentType: 'video/mp4', upsert: true });

        if (storageError) throw storageError;

        const { data: urlData } = supabase.storage.from('videos-receptor').getPublicUrl(fileName);

        const { error: dbError } = await supabase.from('alertas').insert([{ 
            nombre_archivo: fileName, 
            url_video: urlData.publicUrl,
            fecha: new Date()
        }]);

        if (dbError) throw dbError;

        res.status(200).send('Archivado Exitoso');
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🛡️ Sistema Argos Online en puerto ${PORT}`));
