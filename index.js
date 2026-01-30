const express = require('express');
const AWS = require('aws-sdk');
const app = express();

// CONFIGURACIÓN DE STORJ (S3)
const s3 = new AWS.S3({
    accessKeyId: 'TU_ACCESS_KEY', // <--- ASEGÚRATE QUE ESTÉN BIEN
    secretAccessKey: 'TU_SECRET_KEY',
    endpoint: 'https://gateway.storjshare.io',
    s3ForcePathStyle: true,
    signatureVersion: 'v4'
});

// Aceptamos archivos binarios de hasta 20MB
app.use(express.raw({ type: 'application/octet-stream', limit: '20mb' }));

app.get('/', (req, res) => {
    res.send('🛡️ Servidor ARGOS CORE: Almacenamiento Persistente en Storj Activo');
});

// RUTA DE SUBIDA
app.post('/upload', async (req, res) => {
    const fileName = req.query.nombre || `argos_${Date.now()}.avi`;

    const params = {
        Bucket: 'videosargos', // Tu nombre de bucket exacto
        Key: fileName,
        Body: req.body,
        ContentType: 'video/avi',
        ACL: 'public-read' // Intento de forzar lectura pública
    };

    try {
        console.log(`📦 Recibiendo video: ${fileName}...`);
        
        // Subimos el archivo
        const upload = await s3.upload(params).promise();
        
        // CONSTRUCCIÓN DEL LINK PÚBLICO DIRECTO
        // Si el link de upload.Location da error, usamos este formato estándar:
        const publicUrl = `https://gateway.storjshare.io/videosargos/${fileName}`;
        
        console.log("✅ Guardado en Storj:", publicUrl);
        res.send(publicUrl); 
        
    } catch (error) {
        console.error("❌ Error en Storj:", error);
        res.status(500).send("Error de servidor: " + error.message);
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor ARGOS online en puerto ${PORT}`);
});
