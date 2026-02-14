const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const app = express();

// Forzamos la ruta del binario
ffmpeg.setFfmpegPath(ffmpegStatic);

const PORT = process.env.PORT || 10000;

const supabase = createClient(
    process.env.SUPABASE_URL || '', 
    process.env.SUPABASE_KEY || '',
    { auth: { persistSession: false } }
);

// --- SOLUCIÓN DE CARPETA TEMPORAL ---
// Usamos el directorio raíz del proceso de Node
const WORK_DIR = process.cwd();
const tempDir = path.join(WORK_DIR, 'temp');

if (!fs.existsSync(tempDir)) {
    console.log("📂 Creando carpeta temporal...");
    fs.mkdirSync(tempDir, { recursive: true });
}

app.post('/receptor', express.raw({ type: 'application/octet-stream', limit: '50mb' }), async (req, res) => {
    console.log("📥 [SISTEMA] Datos recibidos. Longitud:", req.body.length);
    
    const id = Date.now();
    const aviPath = path.resolve(tempDir, `input_${id}.avi`);
    const mp4Path = path.resolve(tempDir, `output_${id}.mp4`);

    try {
        // Guardar el AVI
        fs.writeFileSync(aviPath, req.body);
        console.log("⚙️ Iniciando transcodificación...");

        ffmpeg()
            .input(aviPath)
            .output(mp4Path)
            .videoCodec('libx264')
            .outputOptions([
                '-pix_fmt yuv420p',
                '-preset ultrafast',
                '-movflags +faststart', // Optimiza para streaming web
                '-crf 28'
            ])
            .on('start', (cmd) => {
                console.log("🚀 Comando ejecutado:", cmd);
            })
            .on('error', (err) => {
                console.error("❌ Fallo en motor FFmpeg:", err.message);
                if (fs.existsSync(aviPath)) fs.unlinkSync(aviPath);
                res.status(500).send("FFMPEG_ERROR");
            })
            .on('end', async () => {
                console.log("✅ Conversión exitosa. Subiendo a la nube...");
                
                try {
                    const mp4Buffer = fs.readFileSync(mp4Path);
                    const { error } = await supabase.storage
                        .from('videos-receptor')
                        .upload(`evidencia_${id}.mp4`, mp4Buffer, {
                            contentType: 'video/mp4',
                            upsert: true
                        });

                    // Limpieza inmediata
                    if (fs.existsSync(aviPath)) fs.unlinkSync(aviPath);
                    if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path);

                    if (error) throw error;

                    console.log("🎉 [FINALIZADO] Video disponible en Dashboard");
                    res.status(200).send("OK_PROCESADO");

                } catch (err) {
                    console.error("❌ Error Supabase:", err.message);
                    res.status(500).send("STORAGE_ERROR");
                }
            })
            .run();

    } catch (err) {
        console.error("❌ Error de Sistema:", err.message);
        res.status(500).send("SERVER_ERROR");
    }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVIDOR ARGOS ONLINE`);
});
