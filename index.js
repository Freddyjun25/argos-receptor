const express = require('express');
const { createClient } = require('@supabase/supabase-client');
const app = express();

// Render leerá las variables que pusiste en el paso anterior
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Configuración para recibir videos de hasta 50MB
app.use(express.raw({ type: 'video/mp4', limit: '50mb' }));

app.post('/upload', async (req, res) => {
    const fileName = `EVIDENCIA_${Date.now()}.mp4`;

    try {
        // 1. Sube el video al Storage de Supabase
        const { data: storageData, error: storageError } = await supabase.storage
            .from('EVIDENCIAS')
            .upload(fileName, req.body, { contentType: 'video/mp4', upsert: true });

        if (storageError) throw storageError;

        // 2. Crea el enlace para ver el video
        const { data: urlData } = supabase.storage.from('EVIDENCIAS').getPublicUrl(fileName);

        // 3. Guarda el registro en tu tabla de alertas
        const { error: dbError } = await supabase
            .from('alertas')
            .insert([{ 
                nombre_archivo: fileName, 
                url_video: urlData.publicUrl 
            }]);

        if (dbError) throw dbError;

        console.log(`✅ ¡Éxito! Video guardado como: ${fileName}`);
        res.status(200).send('Video procesado correctamente');
    } catch (err) {
        console.error('❌ Error en el proceso:', err.message);
        res.status(500).send(err.message);
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Servidor Argos activo en puerto ${PORT}`));
