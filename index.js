const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const UPLOAD_DIR = path.join(__dirname, 'videos');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(express.raw({ type: 'application/octet-stream', limit: '20mb' }));
app.use('/ver', express.static(UPLOAD_DIR));

app.get('/', (req, res) => res.send('Servidor ARGOS funcionando 🚀'));

app.post('/upload', (req, res) => {
    const fileName = req.query.nombre || `argos_${Date.now()}.avi`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    fs.writeFile(filePath, req.body, (err) => {
        if (err) return res.status(500).send("Error al guardar");
        const videoUrl = `https://${req.get('host')}/ver/${fileName}`;
        res.send(videoUrl);
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`Servidor en puerto ${PORT}`));
