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
            // USAMOS TU TOKEN DIRECTAMENTE PARA EVITAR ERRORES DE VARIABLE
            const viewUrl = `https://link.storjshare.io/raw/jx472hnpgj3skpumg6v5xgfh3eia/${BUCKET_NAME}/${file.Key}`;
            const downloadUrl = `https://link.storjshare.io/s/jx472hnpgj3skpumg6v5xgfh3eia/${BUCKET_NAME}/${file.Key}?download=1`;
            
            return `
                <div style="background: rgba(30, 41, 59, 0.7); padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1); color: white; font-family: sans-serif;">
                    <b style="color: #00e5ff;">EVIDENCIA: ${file.Key}</b><br>
                    <video controls style="width: 100%; margin: 10px 0; border-radius: 8px;">
                        <source src="${viewUrl}" type="video/x-msvideo">
                    </video>
                    <br>
                    <a href="${downloadUrl}" style="background: #22c55e; color: white; padding: 10px; text-decoration: none; border-radius: 5px; display: inline-block;">DESCARGAR VIDEO</a>
                </div>`;
        }).reverse().join('');

        res.send(`<html><body style="background: #0f172a; padding: 20px;"><h1 style="color: white; text-align: center;">🛡️ ARGOS CORE</h1><div style="max-width: 600px; margin: auto;">${listaHtml || '<p style="color: white;">Sin videos.</p>'}</div></body></html>`);
    } catch (e) {
        res.status(500).send("Error: " + e.message);
    }
});
