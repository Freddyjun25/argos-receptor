const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000;

// --- CONFIGURACIÓN DE SUPABASE (VERSIÓN REFORZADA) ---

// Verificación de diagnóstico en consola
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error("❌ ERROR: No se encontraron las variables de entorno SUPABASE_URL o SUPABASE_KEY en Render.");
}

// Creación del cliente con mayor tiempo de espera para evitar "fetch failed"
const supabase = createClient(
    process.env.SUPABASE_URL || '', 
    process.env.SUPABASE_KEY || '',
    {
        auth: { persistSession: false },
        global: {
            // Damos 60 segundos de margen para que el video se suba sin cortes
            fetch: (...args) => fetch(...args, { connectTimeout: 60000 })
        }
    }
);

// --- RUTAS DEL SERVIDOR ---

// 1. RUTA DE DIAGNÓSTICO
app.get('/hola', (req, res) => {
    res.send("🚀 Servidor Argos vivo y operando correctamente");
});

// 2. EL RECEPTOR DE VIDEOS (POST)
// Usamos express.raw para recibir el archivo binario directamente del ESP32
app.post('/receptor', express.raw({ type: 'application/octet-stream', limit: '50mb' }), async (req, res) => {
    console.log("📥 [SISTEMA] Recibiendo video desde el ESP32...");
    
    // Extraer nombre del video desde el header que manda el ESP32
    const fileName = req.headers['x-file-name'] || `video_${Date.now()}.avi`;

    try {
        const { data, error } = await supabase.storage
            .from('videos_receptor') // Asegúrate de que el bucket se llame así en Supabase
            .upload(fileName, req.body, {
                contentType: 'video/avi',
                upsert: true
            });

        if (error) {
            console.error("❌ Error Supabase:", error.message);
            // Mandamos el error de vuelta al ESP32 para que lo veamos en el monitor serie
            return res.status(500).send(`Error Supabase: ${error.message}`);
        }

        console.log("✅ [EXITO] Video guardado en Supabase:", fileName);
        res.status(200).send("OK_GUARDADO");

    } catch (err) {
        console.error("❌ Error Crítico en el Servidor:", err.message);
        res.status(500).send(`Error Crítico: ${err.message}`);
    }
});

// 3. CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS
// Servir la carpeta 'public' para el dashboard web
app.use(express.static(path.join(__dirname, 'public')));

// 4. RUTA PRINCIPAL (Carga el index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- INICIO DEL SERVIDOR ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n*********************************`);
    console.log(`🚀 Servidor Argos activo en puerto ${PORT}`);
    console.log(`📂 Ruta del proyecto: ${__dirname}`);
    console.log(`*********************************\n`);
});
