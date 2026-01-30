const express = require('express');
const AWS = require('aws-sdk');
const app = express();
const fileName = req.query.nombre;
/**
 * CONFIGURACIÓN DE ACCESO SEGURO (BÓVEDA STORJ)
 * Credenciales S3 para gestión de evidencias
 */
const s3 = new AWS.S3({
    accessKeyId: 'jucp3dicdgvtt7v6unlc6ufmqvzq', 
    secretAccessKey: 'j2wd5yynuhxjphwwhlniqzfhtarkgrkbv6etf3m64hcvxobk7cbjm',
    endpoint: 'https://gateway.storjshare.io',
    s3ForcePathStyle: true,
    signatureVersion: 'v4'
});

const BUCKET_NAME = 'videosargos';
const STORJ_PUBLIC_TOKEN = 'juif3xjr2h2r7l6r2cshcb3f3ueq'; 

app.use(express.raw({ type: 'application/octet-stream', limit: '20mb' }));

/**
 * PÁGINA PRINCIPAL: PANEL DE CONTROL ARGOS CORE
 * Visualización y descarga centralizada
 */
app.get('/', async (req, res) => {
    try {
        const data = await s3.listObjectsV2({ Bucket: BUCKET_NAME }).promise();
        
        let listaHtml = data.Contents.map(file => {
            // Construcción manual de URLs para evitar errores de plantillas
             const viewUrl = `https://link.storjshare.io/raw/juif3xjr2h2r7l6r2cshcb3f3ueq/videoargos/${fileName}`;
             const downloadUrl = `https://link.storjshare.io/s/juif3xjr2h2r7l6r2cshcb3f3ueq/videoargos/${fileName}?download=1`;
            
            return `
                <div style="background: rgba(30, 41, 59, 0.7); padding: 25px; border-radius: 15px; margin-bottom: 25px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px);">
                    <div style="color: #f8fafc; font-family: sans-serif; margin-bottom: 15px;">
                        <b style="font-size: 18px; color: #00e5ff;">🎬 EVIDENCIA: ${file.Key}</b><br>
                        <small style="color: #94a3b8;">${new Date(file.LastModified).toLocaleString()}</small>
                    </div>
                    
                    <video controls style="width: 100%; border-radius: 10px; background: #000; border: 1px solid #334155;">
                        <source src="${viewUrl}" type="video/x-msvideo">
                        <source src="${viewUrl}" type="video/mp4">
                        Tu navegador no soporta reproducción directa.
                    </video>

                    <div style="text-align: right; margin-top: 15px;">
                        <a href="${downloadUrl}" download style="background: #22c55e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-family: sans-serif;">
                            DESCARGAR ARCHIVO
                        </a>
                    </div>
                </div>`;
        }).reverse().join('');

        res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>ARGOS CORE - Panel de Seguridad</title>
                <style>
                    body { background: #0f172a; min-height: 100vh; margin: 0; padding: 20px; font-family: sans-serif; }
                    .header { text-align: center; margin-bottom: 40px; color: white; }
                    .container { max-width: 800px; margin: auto; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🛡️ SISTEMA ARGOS CORE</h1>
                    <p>Repositorio de Evidencias Institucionales</p>
                </div>
                <div class="container">
                    ${listaHtml || '<p style="color: white; text-align: center;">No hay videos grabados aún.</p>'}
                </div>
            </body>
            </html>
        `);
    } catch (e) {
        res.status(500).send("Error en la bóveda: " + e.message);
    }
});

/**
 * RUTA DE RECEPCIÓN: RECIBE EL BINARIO DEL ESP32
 */
app.post('/upload', async (req, res) => {
    try {
        // ESTO ES LO QUE DEBES PEGAR:
        const fileName = req.query.nombre; // Extrae el nombre del ESP32
        
        if (!fileName) {
            return res.status(400).send("Falta el nombre del archivo");
        }

        const viewUrl = `https://link.storjshare.io/raw/juif3xjr2h2r7l6r2cshcb3f3ueq/videoargos/${fileName}`;
        const downloadUrl = `https://link.storjshare.io/s/juif3xjr2h2r7l6r2cshcb3f3ueq/videoargos/${fileName}?download=1`;

        // ... aquí sigue el código que sube a Storj y registra en Firebase ...
        
    } catch (error) {
        console.error("Error en la bóveda:", error);
        res.status(500).send("Error interno: " + error.message);
    }
});
