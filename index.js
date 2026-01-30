const express = require('express');
const AWS = require('aws-sdk');
const app = express();

/**
 * CONFIGURACIÓN DE ACCESO SEGURO (BÓVEDA STORJ)
 * Uso de credenciales S3 para gestión de objetos
 */
const s3 = new AWS.S3({
    accessKeyId: 'jucp3dicdgvtt7v6unlc6ufmqvzq', 
    secretAccessKey: 'j2wd5yynuhxjphwwhlniqzfhtarkgrkbv6etf3m64hcvxobk7cbjm',
    endpoint: 'https://gateway.storjshare.io',
    s3ForcePathStyle: true,
    signatureVersion: 'v4'
});

const BUCKET_NAME = 'videosargos';
// Token de acceso público del bucket
const STORJ_PUBLIC_TOKEN = 'jx472hnpgj3skpumg6v5xgfh3eia'; 

app.use(express.raw({ type: 'application/octet-stream', limit: '20mb' }));

/**
 * PÁGINA PRINCIPAL: PANEL DE CONTROL ARGOS CORE
 * Interfaz profesional para visualización y descarga
 */
app.get('/', async (req, res) => {
    try {
        const data = await s3.listObjectsV2({ Bucket: BUCKET_NAME }).promise();
        
        let listaHtml = data.Contents.map(file => {
            // URL para visualización en el navegador
            const viewUrl = `https://link.storjshare.io/raw/${jx472hnpgj3skpumg6v5xgfh3eia/${videosargos}/${file.Key}`;
            // URL para forzar la descarga inmediata
            const downloadUrl = `https://link.storjshare.io/s/${jx472hnpgj3skpumg6v5xgfh3eia}/${videosargos}/${file.Key}?download=1`;
            
            return `
                <div style="background: rgba(30, 41, 59, 0.7); padding: 25px; border-radius: 15px; margin-bottom: 25px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
                    <div style="color: #f8fafc; font-family: 'Segoe UI', sans-serif; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <b style="font-size: 18px; color: #00e5ff;">🎬 EVIDENCIA: ${file.Key}</b><br>
                            <small style="color: #94a3b8;">Sincronizado: ${new Date(file.LastModified).toLocaleString()} | ${(file.Size / 1024).toFixed(2)} KB</small>
                        </div>
                        <a href="${downloadUrl}" style="background: #22c55e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">DESCARGAR</a>
                    </div>
                    
                    <video controls style="width: 100%; border-radius: 10px; background: #000; border: 2px solid #334155;">
                        <source src="${viewUrl}" type="video/x-msvideo">
                        <source src="${viewUrl}" type="video/mp4">
                        Tu navegador no admite la reproducción directa.
                    </video>
                </div>`;
        }).reverse().join('');

        res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>ARGOS CORE - Panel de Seguridad</title>
                <style>
                    body { background: #0f172a; background-image: radial-gradient(circle at top right, #1e293b, #0f172a); min-height: 100vh; margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                    .header { text-align: center; margin-bottom: 40px; padding-top: 20px; }
                    .header h1 { color: #ffffff; font-size: 2.8em; margin: 0; letter-spacing: -1px; text-shadow: 0 0 20px rgba(0,229,255,0.3); }
                    .header p { color: #64748b; font-size: 1.2em; margin-top: 10px; }
                    .container { max-width: 850px; margin: auto; }
                    .empty-state { color: #94a3b8; text-align: center; margin-top: 100px; font-size: 1.5em; }
                    ::-webkit-scrollbar { width: 8px; }
                    ::-webkit-scrollbar-track { background: #0f172a; }
                    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🛡️ SISTEMA ARGOS CORE</h1>
                    <p>Panel Institucional de Gestión de Evidencias</p>
                </div>
                <div class="container">
                    ${listaHtml || '<div class="empty-state">No se registran detecciones en la base de datos central.</div>'}
                </div>
            </body>
            </html>
        `);
    } catch (e) {
        res.status(500).send("Error crítico de acceso a la nube: " + e.message);
    }
});

/**
 * RUTA DE RECEPCIÓN: RECIBE EL VIDEO DEL ESP32
 */
app.post('/upload', async (req, res) => {
    const fileName = req.query.nombre || `argos_evidencia_${Date.now()}.avi`;
    
    const params = {
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: req.body,
        ContentType: 'video/avi'
    };

    try {
        console.log(`📦 Almacenando objeto: ${fileName}`);
        await s3.upload(params).promise();
        
        // Link directo que el ESP32 enviará a Firebase
        const finalUrl = `https://link.storjshare.io/s/${STORJ_PUBLIC_TOKEN}/${BUCKET_NAME}/${fileName}?download=1`;
        console.log("✅ Proceso completado exitosamente.");
        res.send(finalUrl); 
        
    } catch (error) {
        console.error("❌ Error en el flujo de datos:", error);
        res.status(500).send("Fallo de almacenamiento: " + error.message);
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVIDOR ARGOS CORE ACTIVO EN PUERTO ${PORT}`);
});
