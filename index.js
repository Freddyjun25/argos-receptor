const express = require('express');
const AWS = require('aws-sdk');
const app = express();

// CONFIGURACIÓN DE STORJ (S3)
const s3 = new AWS.S3({
    accessKeyId: 'jucp3dicdgvtt7v6unlc6ufmqvzq',
    secretAccessKey: 'j2wd5yynuhxjphwwhlniqzfhtarkgrkbv6etf3m64hcvxobk7cbjm',
    endpoint: 'https://gateway.storjshare.io', // Verifica si el tuyo es igual
    s3ForcePathStyle: true,
    signatureVersion: 'v4'
});

// Aceptamos archivos binarios de hasta 20MB
app.use(express.raw({ type: 'application/octet-stream', limit: '20mb' }));

app.get('/', (req, res) => res.send('🛡️ Sistema ARGOS: Nube Segura Activa'));

// RUTA DE SUBIDA
app.post('/upload', async (req, res) => {
    const fileName = req.query.nombre || `argos_${Date.now()}.avi`;

    const params = {
        Bucket: 'videosargos', // Asegúrate de que el Bucket se llame así en Storj
        Key: fileName,
        Body: req.body,
        ContentType: 'video/avi'
        // Eliminamos ACL public-read para evitar errores; usaremos links firmados si es necesario
    };

    try {
        console.log(`📦 Recibiendo video: ${fileName}...`);
        const upload = await s3.upload(params).promise();
        
        // Generamos un link que funcione para el cliente
        const videoUrl = upload.Location;
        console.log("✅ Guardado permanentemente en Storj:", videoUrl);
        
        res.send(videoUrl); 
    } catch (error) {
        console.error("❌ Error subiendo a Storj:", error);
        res.status(500).send("Error en la bóveda de almacenamiento");
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor ARGOS online en puerto ${PORT}`));
