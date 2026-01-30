const express = require('express');
const AWS = require('aws-sdk');
const app = express();

/**
 * CONFIGURACIÓN DE ACCESO SEGURO (BÓVEDA STORJ)
 * Estos datos permiten que el servidor gestione los archivos de forma permanente.
 */
const s3 = new AWS.S3({
    accessKeyId: 'jucp3dicdgvtt7v6unlc6ufmqvzq', 
    secretAccessKey: 'j2wd5yynuhxjphwwhlniqzfhtarkgrkbv6etf3m64hcvxobk7cbjm',
    endpoint: 'https://gateway.storjshare.io',
    s3ForcePathStyle: true,
    signatureVersion: 'v4'
});

const BUCKET_NAME = 'videosargos';
// Tu token permanente extraído de la interfaz de Storj
const STORJ_PUBLIC_TOKEN = 'jvpbflyr46hvz7mxjqxhlk4vywxa'; 

app.use(express.raw({ type: 'application/octet-stream', limit: '20mb' }));

/**
 * PÁGINA PRINCIPAL: PANEL DE CONTROL ARGOS CORE
 * Esta interfaz lista todos los videos y permite su descarga inmediata.
 */
app.get('/', async (req, res) => {
    try {
        const data = await s3.listObjectsV2({ Bucket: BUCKET_NAME }).promise();
        
        // Generamos la lista de videos con diseño profesional para la tesis
        let listaHtml = data.Contents.map(file => {
            // URL de descarga directa "RAW" (Evita restricciones de la interfaz de Storj)
            const downloadUrl = `https://link.storjshare.io/raw/${STORJ_PUBLIC_TOKEN}/${BUCKET_NAME}/${file.Key}`;
            
            return `
                <div style="background: rgba(30, 41, 59, 0.7); padding: 20px; border-radius: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(5px);">
                    <div style="color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="background: #3b82f6; width: 10px; height: 10px; border-radius: 50%;"></span>
                            <b style="font-size: 16px; color: #00e5ff;">EVIDENCIA: ${file.Key}</b>
                        </div>
                        <p style="margin: 5px 0 0 20px; font-size: 12px; color: #94a3b8;">
                            Sincronizado: ${new Date(file.LastModified).toLocaleString()} | Tamaño: ${(file.Size / 1024).toFixed(2)} KB
                        </p>
                    </div>
                    <a href="${downloadUrl}" download style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-family: sans-serif; transition: 0.3s; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                        DESCARGAR
                    </a>
                </div>`;
        }).reverse().join(''); // Los videos más recientes primero

        res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>ARGOS CORE - Panel de Seguridad</title>
                <style>
                    body { background-color: #0f172a; background-image: radial-gradient(circle at top right, #1e293b, #0f172a); min-height: 100vh; margin: 0; padding: 40px; }
                    .header { text-align: center; margin-bottom: 50px; }
                    .header h1 { color: #ffffff; font-family: 'Inter', sans-serif; font-size: 2.5em; letter-spacing: -1px; margin-bottom: 10px; }
                    .header p { color: #64748b; font-family: sans-serif; font-size: 1.1em; }
                    .container { max-width: 900px; margin: auto; }
                    .empty { color: #94a3b8; text-align: center; font-family: sans-serif; margin-top: 50px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🛡️ SISTEMA ARGOS CORE</h1>
                    <p>Repositorio Centralizado de Evidencias Institucionales</p>
                </div>
                <div class="container">
                    ${listaHtml || '<div class="empty">Esperando detecciones del sistema...</div>'}
                </div>
            </body>
            </html>
        `);
    } catch (e) {
        res.status(500).send("Error de conexión con la bóveda: " + e.message);
    }
});

/**
 * RUTA DE RECEPCIÓN: RECIBE EL BINARIO DEL ESP32
 */
app.post('/upload', async (req, res) => {
    const fileName = req.query.nombre || `alerta_${Date.now()}.avi`;
    
    const params = {
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: req.body,
        ContentType: 'video/avi'
    };

    try {
        console.log(`📦 Procesando subida de: ${fileName}`);
        await s3.upload(params).promise();
        
        // URL para que el ESP32 la registre en Firebase
        const finalUrl = `https://link.storjshare.io/raw/${STORJ_PUBLIC_TOKEN}/${BUCKET_NAME}/${fileName}`;
        console.log("✅ Video almacenado y verificado.");
        res.send(finalUrl); 
        
    } catch (error) {
        console.error("❌ Error en subida:", error);
        res.status(500).send("Error de almacenamiento: " + error.message);
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ARGOS CORE SERVER ONLINE | PUERTO ${PORT}`);
});
