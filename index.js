const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static'); // Motor de video integrado
const fs = require('fs');
const app = express();

// Configuramos FFmpeg para que use el binario estático que instalamos
ffmpeg.setFfmpegPath(ffmpegStatic);

const PORT = process.env.PORT || 10000;

// --- CONFIGURACIÓN DE SUPABASE ---
const supabase = createClient(
    process.env.SUPABASE_URL || '', 
    process.env.SUPABASE_KEY || '',
    {
        auth: { persistSession: false }
    }
);

// Usamos la carpeta /tmp de Render que tiene permisos de escritura asegurados
const tempDir = '/tmp';

// --- RUTAS DEL SERVIDOR ---

app.get('/hola', (req, res) => {
    res.send("🚀 Servidor Argos vivo y operando con motor FFmpeg integrado");
});

// 2. EL RECEPTOR Y CONVERSOR DE VIDEOS
app.post('/receptor', express.raw({ type: 'application/octet-stream', limit: '50mb' }), async (req, res) => {
    console.log("📥 [SISTEMA] Recibiendo video AVI desde el ESP32...");
    
    const idUnico = Date.now();
    const aviName = `video_${idUnico}.avi`;
    const mp4Name = `video_${idUnico}.mp4`;
    
    const aviPath = path.join(tempDir, aviName);
    const mp4Path = path.join(tempDir, mp4Name);

    try {
        // 1. Guardar el archivo AVI recibido en la carpeta temporal
        fs.writeFileSync(aviPath, req.body);
        console.log("⚙️ Iniciando conversión profesional a MP4...");

        // 2. Proceso de Transcodificación
        ffmpeg(aviPath)
            .outputOptions([
                '-vcodec libx264',   // Formato H.264 universal
                '-pix_fmt yuv420p',  // Compatibilidad total con navegadores
                '-preset ultrafast', // Velocidad máxima para no agotar el tiempo de Render
                '-crf 28'            // Balance óptimo entre peso y calidad
            ])
            .on('end', async () => {
                console.log("✅ Conversión terminada con éxito.");

                try {
                    // 3. Subir el video MP4 final a Supabase
                    const mp4Buffer = fs.readFileSync(mp4Path);
                    const { data, error } = await supabase.storage
                        .from('videos-receptor')
                        .upload(mp4Name, mp4Buffer, {
                            contentType: 'video/mp4',
                            upsert: true
                        });

                    // Limpieza total de archivos para liberar espacio en Render
                    if (fs.existsSync(aviPath)) fs.unlinkSync(aviPath);
                    if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path);

                    if (error) {
                        console.error("❌ Error de Supabase al subir:", error.message);
                        return res.status(500).send(`Error Supabase: ${error.message}`);
                    }

                    console.log("🎊 [EXITO] Evidencia MP4 disponible en Supabase:", mp4Name);
                    res.status(200).send("OK_CONVERTIDO_Y_GUARDADO");

                } catch (uploadErr) {
                    console.error("❌ Error en proceso de subida:", uploadErr.message);
                    res.status(500).send("Error al subir video final");
                }
            })
            .on('error', (err) => {
                console.error("❌ Error crítico en FFmpeg:", err.message);
                // Borrar el AVI original si la conversión falla para no dejar basura
                if (fs.existsSync(aviPath)) fs.unlinkSync(aviPath);
                res.status(500).send("Error en procesamiento de video");
            })
            .save(mp4Path);

    } catch (err) {
        console.error("❌ Error en el sistema de archivos:", err.message);
        res.status(500).send(`Error de servidor: ${err.message}`);
    }
});

// 3. CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- INICIO DEL SERVIDOR ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n*****************************************`);
    console.log(`🚀 ARGOS CORE: Operando en puerto ${PORT}`);
    console.log(`📹 Motor de Video: FFmpeg Static Activo`);
    console.log(`*****************************************\n`);
});
