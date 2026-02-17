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

// --- VARIABLE GLOBAL TEMPORAL ---
let ultimaIpEsp32 = "No reportada";
let ultimaActividad = Date.now();

app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// --- RECEPCIÓN DE VIDEO (ESP32) ---
// Optimizamos para capturar la IP del remitente automáticamente
app.post('/receptor', express.raw({ type: 'application/octet-stream', limit: '50mb' }), async (req, res) => {
    console.log("📥 [SISTEMA] Recibiendo video...");
    
    // Detectar IP automáticamente si no viene por query
    const ipRemitente = req.query.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    ultimaIpEsp32 = ipRemitente.replace('::ffff:', ''); 
    ultimaActividad = Date.now();

    const id = Date.now();
    const aviPath = `/tmp/in_${id}.avi`;
    const mp4Path = `/tmp/out_${id}.mp4`;

    // Nombre de archivo con IP integrada para que el dashboard la lea
    const nombreFinal = `evidencia_${id}_${ultimaIpEsp32.replace(/\./g, '-')}`;

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
                    await supabase.storage.from('videos-receptor').upload(`${nombreFinal}.avi`, originalBuffer, {
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
                    await supabase.storage.from('videos-receptor').upload(`${nombreFinal}.mp4`, mp4Buffer, {
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
app.get('/log_ip', (req, res) => {
    const ip = req.query.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip) {
        ultimaIpEsp32 = ip.replace('::ffff:', '');
        ultimaActividad = Date.now();
        console.log(`📡 [DISPOSITIVO] IP Actualizada: ${ultimaIpEsp32}`);
        res.status(200).send("IP_REGISTRADA");
    } else { res.status(400).send("FALTA_IP"); }
});

// Esta es la ruta que consultará tu Dashboard
app.get('/get_esp_ip', (req, res) => {
    const haceCuanto = (Date.now() - ultimaActividad) / 1000 / 60;
    if (haceCuanto > 10) { // Si no hay señales en 10 min, está offline
        res.json({ ip: "OFFLINE", status: "offline" });
    } else {
        res.json({ ip: ultimaIpEsp32, status: "online" });
    }
});

app.get('/api/lista-videos', async (req, res) => {
    const { data, error } = await supabase.storage.from('videos-receptor').list('', {
        limit: 50,
        sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error) return res.status(500).json({ error: error.message });
    
    const videosConUrl = data.map(file => {
        const { data: urlData } = supabase.storage.from('videos-receptor').getPublicUrl(file.name);
        return { name: file.name, url: urlData.publicUrl, created: file.created_at };
    });
    res.json(videosConUrl);
});

app.get('*', (req, res) => { res.redirect('/'); });

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 SERVIDOR ARGOS UNIFICADO`);
});
