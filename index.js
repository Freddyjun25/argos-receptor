const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 10000;

// --- CONFIGURACIÓN DE SUPABASE ---
const supabase = createClient(
    process.env.SUPABASE_URL || '', 
    process.env.SUPABASE_KEY || '',
    {
        auth: { persistSession: false }
    }
);

// Asegurarnos de que exista una carpeta temporal para procesar los videos
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// --- RUTAS DEL SERVIDOR ---

app.get('/hola', (req, res) => {
    res.send("🚀 Servidor Argos vivo y operando con conversor MP4");
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
        // 1. Guardar el archivo AVI temporalmente en el servidor
        fs.writeFileSync(aviPath, req.body);
        console.log("⚙️ Procesando conversión a MP4...");

        // 2. Convertir de AVI a MP4 usando FFmpeg
        ffmpeg(aviPath)
            .outputOptions([
                '-vcodec libx264',   // Codec universal
                '-pix_fmt yuv420p',  // Compatible con todos los navegadores
                '-preset ultrafast', // Máxima velocidad para Render
                '-crf 28'            // Calidad balanceada
            ])
            .on('end', async () => {
                console.log("✅ Conversión terminada. Subiendo a Supabase...");

                // 3. Subir el video MP4 ya convertido a Supabase
                const mp4Buffer = fs.readFileSync(mp4Path);
                const { data, error } = await supabase.storage
                    .from('videos-receptor')
                    .upload(mp4Name, mp4Buffer, {
                        contentType: 'video/mp4',
                        upsert: true
                    });

                // Limpiar archivos temporales para no llenar el servidor
                if (fs.existsSync(aviPath)) fs.unlinkSync(aviPath);
                if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path);

                if (error) {
                    console.error("❌ Error Supabase:", error.message);
                    return res.status(500).send(`Error Supabase: ${error.message}`);
                }

                console.log("🎊 [EXITO] Video MP4 guardado en Supabase:", mp4Name);
                res.status(200).send("OK_CONVERTIDO_Y_GUARDADO");
            })
            .on('error', (err) => {
                console.error("❌ Error en FFmpeg:", err.message);
                if (fs.existsSync(aviPath)) fs.unlinkSync(aviPath);
                res.status(500).send("Error en conversión de video");
            })
            .save(mp4Path);

    } catch (err) {
        console.error("❌ Error Crítico:", err.message);
        res.status(500).send(`Error Crítico: ${err.message}`);
    }
});

// 3. CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- INICIO DEL SERVIDOR ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Servidor Argos Activo en puerto ${PORT}`);
});
