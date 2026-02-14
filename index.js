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

// RUTA CRÍTICA: En Render, SOLO /tmp es escribible en tiempo de ejecución
const tempDir = '/tmp'; 

app.post('/receptor', express.raw({ type: 'application/octet-stream', limit: '50mb' }), async (req, res) => {
    console.log("📥 [SISTEMA] Recibiendo video...");
    
    const id = Date.now();
    // Nombres ultra simples para evitar errores de sistema de archivos
    const aviPath = `/tmp/in_${id}.avi`;
    const mp4Path = `/tmp/out_${id}.mp4`;

    try {
        // 1. Escribir el AVI en /tmp
        fs.writeFileSync(aviPath, req.body);
        console.log("⚙️ Transcodificando en /tmp...");

        ffmpeg(aviPath)
            .output(mp4Path)
            .videoCodec('libx264')
            .outputOptions([
                '-pix_fmt yuv420p',
                '-preset ultrafast',
                '-movflags +faststart',
                '-crf 28'
            ])
            .on('error', (err) => {
                console.error("❌ FFmpeg falló:", err.message);
                if (fs.existsSync(aviPath)) fs.unlinkSync(aviPath);
                res.status(500).send("ERR_CONVERSION");
            })
            .on('end', async () => {
                console.log("✅ Convertido. Subiendo...");
                
                try {
                    const mp4Buffer = fs.readFileSync(mp4Path);
                    const { error } = await supabase.storage
                        .from('videos-receptor')
                        .upload(`camara_${id}.mp4`, mp4Buffer, {
                            contentType: 'video/mp4',
                            upsert: true
                        });

                    // Limpieza total
                    if (fs.existsSync(aviPath)) fs.unlinkSync(aviPath);
                    if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path);

                    if (error) throw error;

                    console.log("🎊 ¡CONSEGUIDO! Video en Supabase.");
                    res.status(200).send("OK_FINAL");
                } catch (err) {
                    console.error("❌ Error Storage:", err.message);
                    res.status(500).send("ERR_STORAGE");
                }
            })
            .run();

    } catch (err) {
        console.error("❌ Error FS:", err.message);
        res.status(500).send("ERR_SERVER");
    }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVIDOR ARGOS LISTO EN /tmp`);
});
