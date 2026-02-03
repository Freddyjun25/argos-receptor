const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Credenciales de Supabase (Las sacas de Settings -> API en Supabase)
const supabase = createClient('https://evnfyrkpfvlonlfkhbkr.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2bmZ5cmtwZnZsb25sZmtoYmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzcwMTgsImV4cCI6MjA4NTY1MzAxOH0.jA6qZpOxZkvC2TgoR49knwnlKnsaBQnauhA41-1slUk');

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
