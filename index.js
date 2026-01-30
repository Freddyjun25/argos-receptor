const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const UPLOAD_DIR = path.join(__dirname, 'videos');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// Middleware para recibir el flujo de datos del ESP32
app.use(express.raw({ type: 'application/octet-stream', limit: '20mb' }));

// Servir la carpeta de videos para que se puedan ver en el navegador
app.use('/ver', express.static(UPLOAD_DIR));

app.post('/upload', (req, res) => {
    const fileName = req.query.nombre || `argos_${Date.now()}.avi`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    fs.writeFile(filePath, req.body, (err) => {
        if (err) return res.status(500).send("Error al guardar");
        
        const videoUrl = `https://${req.get('host')}/ver/${fileName}`;
        console.log("✅ Video recibido:", videoUrl);
        res.send(videoUrl);
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 ARGOS Cloud activo en puerto ${PORT}`));
