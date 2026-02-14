const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const app = express();

// Configuración de ruta estática para FFmpeg
ffmpeg.setFfmpegPath(ffmpegStatic);

const PORT = process.env.PORT || 10000;

const supabase = createClient(
    process.env.SUPABASE_URL || '', 
    process.env.SUPABASE_KEY || '',
    { auth: { persistSession: false } }
);

app.post('/receptor', express.raw({ type: 'application/octet-stream', limit: '50mb' }), async (req, res) => {
    console.log("📥 [SISTEMA] Recibiendo video...");
    
    const id = Date.now();
    const aviPath = `/tmp/in_${id}.avi`;
    const mp4Path = `/tmp/out_${id}.mp4`;

    try {
        // 1. Escribir el archivo AVI original en /tmp
        fs.writeFileSync(aviPath, req.body);
        console.log("⚙️ Intentando conversión simplificada...");

        // 2. Proceso FFmpeg con el mínimo de argumentos posible
        ffmpeg(aviPath)
            .output(mp4Path)
            .videoCodec('libx264')
            .addOptions([
                '-preset ultrafast',
                '-crf 28',
                '-pix_fmt yuv420p'
            ])
            .on('start', (commandLine) => {
                console.log('🚀 Ejecutando:', commandLine);
            })
            .on('error', async (err) => {
                console.error("❌ FFmpeg falló:", err.message);
                
                // --- PLAN DE RESCATE ---
                // Si la conversión falla, subimos el AVI original renombrado a .mp4
                // Esto asegura que el ESP32 reciba un OK y la evidencia llegue a la nube
                console.log("⚠️ Rescatando archivo original para no perder evidencia...");
                try {
                    const originalBuffer = fs.readFileSync(aviPath);
                    await supabase.storage
                        .from('videos-receptor')
                        .upload(`rescatado_${id}.mp4`, originalBuffer, {
                            contentType: 'video/mp4',
                            upsert: true
                        });
                    console.log("🎊 Evidencia rescatada (formato original).");
                    res.status(200).send("OK_RESCATADO");
                } catch (e) {
                    res.status(500).send("ERR_FATAL");
                } finally {
                    if (fs.existsSync(aviPath)) fs.unlinkSync(aviPath);
                }
            })
            .on('end', async () => {
                console.log("✅ Conversión exitosa. Subiendo...");
                
                try {
                    const mp4Buffer = fs.readFileSync(mp4Path);
                    const { error } = await supabase.storage
                        .from('videos-receptor')
                        .upload(`camara_${id}.mp4`, mp4Buffer, {
                            contentType: 'video/mp4',
                            upsert: true
                        });

                    if (error) throw error;

                    console.log("🎊 ¡CONSEGUIDO! MP4 en Supabase.");
                    res.status(200).send("OK_FINAL");
                } catch (err) {
                    console.error("❌ Error Storage:", err.message);
                    res.status(500).send("ERR_STORAGE");
                } finally {
                    if (fs.existsSync(aviPath)) fs.unlinkSync(aviPath);
                    if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path);
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
    console.log(`🚀 SERVIDOR ARGOS ACTIVO - MODO HÍBRIDO`);
});
