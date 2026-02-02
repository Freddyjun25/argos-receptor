const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();

// Aumentamos el límite para videos de alta calidad
app.use(express.raw({ type: 'video/mp4', limit: '100mb' }));

// Conexión segura con Supabase (Variables de entorno)
const supabaseURL = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseURL, supabaseKey);

app.post('/upload', async (req, res) => {
    // Generamos un nombre profesional con fecha y hora
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `EVIDENCIA_ARGOS_${timestamp}.mp4`;

    try {
        console.log(`📥 Recibiendo alerta: ${fileName}`);

        // 1. Subir video al Repositorio Seguro (Storage)
        const { error: storageError } = await supabase.storage
            .from('videos-receptor')
            .upload(fileName, req.body, { contentType: 'video/mp4', upsert: true });

        if (storageError) throw new Error(`Storage Error: ${storageError.message}`);

        // 2. Obtener el enlace público (Para ver y descargar)
        const { data: urlData } = supabase.storage
            .from('videos-receptor')
            .getPublicUrl(fileName);

        // 3. Registrar el evento en la Base de Datos (Para tu historial)
        const { error: dbError } = await supabase
            .from('alertas')
            .insert([{ 
                nombre_archivo: fileName, 
                url_video: urlData.publicUrl,
                fecha: new Date(),
                estado: 'Revisión Pendiente' // Ideal para uso institucional
            }]);

        if (dbError) throw new Error(`Database Error: ${dbError.message}`);

        console.log('✅ Alerta procesada y archivada correctamente.');
        res.status(200).send('Archivado Exitoso');

    } catch (err) {
        console.error('❌ Error Crítico:', err.message);
        res.status(500).send(err.message);
    }
});

// Puerto dinámico para estabilidad en la nube
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🛡️ Sistema Argos Institucional Activo en puerto ${PORT}`));
