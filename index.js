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

// --- CONFIGURACIÓN DE RUTAS Y SEGURIDAD ---

// IMPORTANTE: Agregamos { index: false } para que Express NO sirva el index.html automáticamente
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// 1. La raíz "/" ahora sirve EXCLUSIVAMENTE el login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 2. Ruta protegida para el Dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- RECEPCIÓN DE VIDEO (ESP32) ---

app.post('/receptor', express.raw({ type: 'application/octet-stream', limit: '50mb' }), async (req, res) => {
    console.log("📥 [SISTEMA] Recibiendo video...");
    const id = Date.now();
    const aviPath = `/tmp/in_${id}.avi`;
    const mp4Path = `/tmp/out_${id}.mp4`;

    try {
        fs.writeFileSync(aviPath, req.body);
        ffmpeg(aviPath)
            .output(mp4Path)
            .videoCodec('libx264')
            .addOptions(['-preset ultrafast', '-crf 28', '-pix_fmt yuv420p'])
            .on('error', async (err) => {
                console.error("⚠️ FFmpeg falló, activando rescate AVI...");
                try {
                    const originalBuffer = fs.readFileSync(aviPath);
                    await supabase.storage.from('videos-receptor').upload(`evidencia_${id}.avi`, originalBuffer, {
                        contentType: 'video/x-msvideo',
                        upsert: true
                    });
                    res.status(200).send("OK_RESCATADO");
                } catch (e) { res.status(500).send("ERR_FATAL"); }
                finally { if (fs.existsSync(aviPath)) fs.unlinkSync(aviPath); }
            })
            .on('end', async () => {
                try {
                    const mp4Buffer = fs.readFileSync(mp4Path);
                    await supabase.storage.from('videos-receptor').upload(`camara_${id}.mp4`, mp4Buffer, {
                        contentType: 'video/mp4',
                        upsert: true
                    });
                    res.status(200).send("OK_FINAL");
                } catch (err) { res.status(500).send("ERR_STORAGE"); }
                finally {
                    if (fs.existsSync(aviPath)) fs.unlinkSync(aviPath);
                    if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path);
                }
            })
            .run();
    } catch (err) { res.status(500).send("ERR_SERVER"); }
});

// --- GESTIÓN DE IP ---

let ultimaIpEsp32 = "No reportada";

app.get('/log_ip', (req, res) => {
    const ip = req.query.ip;
    if (ip) {
        ultimaIpEsp32 = ip;
        console.log(`📡 [DISPOSITIVO] Nueva IP recibida de ARGOS CORE: ${ip}`);
        res.status(200).send("IP_REGISTRADA");
    } else { res.status(400).send("FALTA_IP"); }
});

app.get('/get_esp_ip', (req, res) => {
    res.json({ ip: ultimaIpEsp32 });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 SERVIDOR ARGOS PROTEGIDO Y ACTIVO`);
    console.log(`🔗 Acceso principal: /`);
    console.log(`🔗 Panel de control: /dashboard`);
});
