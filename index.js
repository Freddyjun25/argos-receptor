const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const app = express();

app.use(express.raw({ type: 'video/mp4', limit: '100mb' }));
app.use(express.static('public')); // Esto servirá tu página web

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Ruta para ver la página web
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para recibir videos
app.post('/upload', async (req, res) => {
    const fileName = `ARGOS_${Date.now()}.mp4`;
    try {
        const { error: storageError } = await supabase.storage
            .from('videos-receptor')
            .upload(fileName, req.body, { contentType: 'video/mp4' });

        if (storageError) throw storageError;

        const { data: urlData } = supabase.storage.from('videos-receptor').getPublicUrl(fileName);

        await supabase.from('alertas').insert([{ 
            nombre_archivo: fileName, 
            url_video: urlData.publicUrl,
            fecha: new Date()
        }]);

        res.status(200).send('Archivado Exitoso');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Sistema Argos centralizado en puerto ${PORT}`));
