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
    // Usamos /tmp que es la única carpeta con permisos de escritura en Render
    const aviPath = `/tmp/in_${id}.avi`;
    const mp4Path = `/tmp/out_${id}.mp4`;

    try {
        // 1. Escribir el archivo AVI original recibido del ESP32
        fs.writeFileSync(aviPath, req.body);
        console.log("⚙️ Intentando conversión simplificada...");

        // 2. Proceso FFmpeg
        ffmpeg(aviPath)
            .output(mp4Path)
            .videoCodec('libx264')
            .addOptions([
                '-preset ultrafast',
                '-crf 28',
                '-pix_fmt yuv420p'
            ])
            .on('start', (commandLine) => {
                console.log('🚀 Ejecutando FFmpeg:', commandLine);
            })
            .on('error', async (err) => {
                console.error("❌ FFmpeg falló (Probable restricción de Render):", err.message);
                
                // --- PLAN DE RESCATE (CAMINO 1) ---
                // Si la conversión falla, subimos el AVI crudo con extensión .avi
                // Esto permite que al descargarlo sea un video válido y fluido
                console.log("⚠️ Rescatando archivo original como .avi para asegurar fluidez...");
                try {
                    const originalBuffer = fs.readFileSync(aviPath);
                    const { error } = await supabase.storage
                        .from('videos-receptor')
                        .upload(`evidencia_${id}.avi`, originalBuffer, {
                            contentType: 'video/x-msvideo', // MIME type oficial de AVI
                            upsert: true
                        });

                    if (error) throw error;

                    console.log("🎊 Evidencia guardada exitosamente como AVI.");
                    res.status(200).send("OK_RESCATADO");
                } catch (e) {
                    console.error("❌ Error en rescate:", e.message);
                    res.status(500).send("ERR_FATAL");
                } finally {
                    if (fs.existsSync(aviPath)) fs.unlinkSync(aviPath);
                }
            })
            .on('end', async () => {
                console.log("✅ Conversión exitosa a MP4. Subiendo...");
                
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
        console.error("❌ Error de Sistema (FS):", err.message);
        res.status(500).send("ERR_SERVER");
    }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Variable para guardar la última IP reportada por el ESP32
let ultimaIpEsp32 = "No reportada";

// --- RUTA PARA EL REPORTE DE IP (Solución al error 404) ---
app.get('/log_ip', (req, res) => {
    const ip = req.query.ip;
    if (ip) {
        ultimaIpEsp32 = ip;
        console.log(`📡 [DISPOSITIVO] Nueva IP recibida de ARGOS CORE: ${ip}`);
        res.status(200).send("IP_REGISTRADA");
    } else {
        res.status(400).send("FALTA_IP");
    }
});

// --- RUTA PARA CONSULTAR LA IP DESDE EL DASHBOARD ---
app.get('/get_esp_ip', (req, res) => {
    res.json({ ip: ultimaIpEsp32 });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 SERVIDOR ARGOS ACTIVO`);
    console.log(`📂 Almacenamiento temporal en /tmp`);
});
