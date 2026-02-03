const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Credenciales de Supabase (Las sacas de Settings -> API en Supabase)
const supabase = createClient('TU_SUPABASE_URL', 'TU_SUPABASE_KEY');

app.post('/upload', upload.single('video'), async (req, res) => {
    const file = req.file;
    const fileName = `evidencia_${Date.now()}.mp4`;

    // Leer el archivo temporal
    const fileContent = fs.readFileSync(file.path);

    // Subir a Supabase Storage
    const { data, error } = await supabase
        .storage
        .from('videos-receptor') // El nombre de tu bucket
        .upload(fileName, fileContent, {
            contentType: 'video/mp4'
        });

    if (error) {
        return res.status(500).send("Error subiendo video");
    }

    res.send("Video guardado en la nube segura");
});
