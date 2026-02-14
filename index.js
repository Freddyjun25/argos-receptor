const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const app = express();

ffmpeg.setFfmpegPath(ffmpegStatic);

const PORT = process.env.PORT || 10000;

const supabase = createClient(
    process.env.SUPABASE_URL || '', 
    process.env.SUPABASE_KEY || '',
    { auth: { persistSession: false } }
);

// USAREMOS ESTA RUTA QUE ES SEGURA EN RENDER
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

app.get('/hola', (req, res) => {
    res.send("🚀 Servidor Argos vivo con FFmpeg Fix");
});

app.post('/receptor', express.raw({ type: 'application/octet-stream', limit: '50mb' }), async (req, res) => {
    console.log("📥 [SISTEMA] Recibiendo video AVI...");
    
    const idUnico = Date.now();
    const aviPath = path.join(tempDir, `video_${idUnico}.avi`);
    const mp4Path = path.join(tempDir, `video_${idUnico}.mp4`);

    try {
        // 1. Guardar el AVI
        fs.writeFileSync(aviPath, req.body);
        console.log("⚙️ Convirtiendo a MP4 en carpeta local...");

        // 2. Convertir
        ffmpeg(aviPath)
            .output(mp4Path) // Especificamos el archivo de salida claramente
            .outputOptions([
                '-vcodec libx264',
                '-pix_fmt yuv420p',
                '-preset ultrafast',
                '-crf 28'
            ])
            .on('end', async () => {
                console.log("✅ MP4 creado. Subiendo...");
                
                try {
                    const mp4Buffer = fs.readFileSync(mp4Path);
                    const { error } = await supabase.storage
                        .from('videos-receptor')
                        .upload(`video_${idUnico}.mp4`, mp4Buffer, {
                            contentType: 'video/mp4',
                            upsert: true
                        });

                    // Limpieza
                    if (fs.existsSync(aviPath)) fs.unlinkSync(aviPath);
                    if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path);

                    if (error) throw error;

                    console.log("🎊 ¡ÉXITO TOTAL!");
                    res.status(200).send("OK_GUARDADO");
                } catch (err) {
                    console.error("❌ Error subiendo:", err.message);
                    res.status(500).send("Error Supabase");
                }
            })
            .on('error', (err) => {
                console.error("❌ Error FFmpeg:", err.message);
                if (fs.existsSync(aviPath)) fs.unlinkSync(aviPath);
                res.status(500).send("Error FFmpeg");
            })
            .run(); // Usamos .run() para asegurar la ejecución

    } catch (err) {
        console.error("❌ Error Sistema:", err.message);
        res.status(500).send("Error Servidor");
    }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ARGOS ONLINE EN PUERTO ${PORT}`);
});
