const express = require('express');
const AWS = require('aws-sdk');
const app = express();

// 1. Configurar la conexión a Storj
const s3 = new AWS.S3({
    accessKeyId: 'TU_ACCESS_KEY_DE_STORJ',
    secretAccessKey: 'TU_SECRET_KEY_DE_STORJ',
    endpoint: 'https://gateway.storjshare.io', // Verifica si el tuyo es diferente
    s3ForcePathStyle: true,
    signatureVersion: 'v4',
    connectTimeout: 0,
    httpOptions: { timeout: 0 }
});

app.use(express.raw({ type: 'application/octet-stream', limit: '20mb' }));

app.get('/', (req, res) => res.send('ARGOS Cloud con Almacenamiento Persistente Activo 🛡️'));

app.post('/upload', async (req, res) => {
    const fileName = req.query.nombre || `argos_${Date.now()}.avi`;

    const params = {
        Bucket: 'videos-argos', // El nombre del bucket que creaste
        Key: fileName,
        Body: req.body,
        ContentType: 'video/avi',
        ACL: 'public-read' // Para que el link se pueda ver
    };

    try {
        const upload = await s3.upload(params).promise();
        console.log("✅ Guardado en Storj:", upload.Location);
        res.send(upload.Location); // Devolvemos el link permanente al ESP32
    } catch (error) {
        console.error("❌ Error en Storj:", error);
        res.status(500).send("Error de almacenamiento");
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor Blindado en puerto ${PORT}`));
