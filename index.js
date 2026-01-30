const express = require('express');
const admin = require('firebase-admin');
const AWS = require('aws-sdk');
const app = express();
const port = process.env.PORT || 3000;

// 1. CONFIGURACIÓN FIREBASE
// Asegúrate de tener tus credenciales en el archivo serviceAccountKey.json
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://argos-core-662a0-default-rtdb.firebaseio.com"
});
const db = admin.database();

// 2. CONFIGURACIÓN STORJ (Vía S3 Gateway)
const s3 = new AWS.S3({
  accessKeyId: 'juif3xjr2h2r7l6r2cshcb3f3ueq', // Tu llave de Storj
  secretAccessKey: 'j2wd5yynuhxjphwwhlniqzfhtarkgrkbv6etf3m64hcvxobk7cbjm',       // Reemplaza con tu Secret Key
  endpoint: 'https://gateway.storjshare.io',
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
  region: 'us-east-1'
});

app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

// RUTA PARA RECIBIR VIDEOS DEL ESP32
app.post('/upload', async (req, res) => {
  try {
    const fileName = req.query.nombre; // Extraemos el nombre que envía el ESP32

    if (!fileName) {
      return res.status(400).send("Error: No se recibió el nombre del archivo.");
    }

    console.log(`Recibiendo video: ${fileName}`);

    // Subir a Storj
    const params = {
      Bucket: 'videoargos',
      Key: fileName,
      Body: req.body,
      ContentType: 'video/x-msvideo'
    };

    await s3.upload(params).promise();

    // Generar enlaces corregidos con Backticks
    const viewUrl = `https://link.storjshare.io/raw/juif3xjr2h2r7l6r2cshcb3f3ueq/videoargos/${fileName}`;
    const downloadUrl = `https://link.storjshare.io/s/juif3xjr2h2r7l6r2cshcb3f3ueq/videoargos/${fileName}?download=1`;

    // Registrar en Firebase
    const ref = db.ref('alertas');
    await ref.push({
      timestamp: new Date().toLocaleString(),
      video_url: viewUrl,
      download_url: downloadUrl,
      dispositivo: "Argos Core S3"
    });

    console.log("✅ Proceso completado con éxito");
    res.status(200).send(viewUrl); // Devolvemos el link al ESP32

  } catch (error) {
    console.error("❌ Error en el proceso:", error);
    res.status(500).send("Error interno del servidor");
  }
});

// PÁGINA PRINCIPAL PARA VER EVIDENCIAS
app.get('/', async (req, res) => {
  const ref = db.ref('alertas');
  const snapshot = await ref.once('value');
  const alertas = snapshot.val() || {};

  let html = `
  <html>
    <head>
      <title>ARGOS RECEPTOR - EVIDENCIAS</title>
      <style>
        body { font-family: sans-serif; background: #0f172a; color: white; text-align: center; }
        .card { background: #1e293b; margin: 20px auto; padding: 20px; width: 80%; border-radius: 10px; }
        video { width: 100%; max-width: 600px; border-radius: 8px; }
        a { color: #3b82f6; text-decoration: none; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>🛡️ REPOSITORIO DE EVIDENCIAS ARGOS</h1>
      <div id="lista">`;
  
  Object.values(alertas).reverse().forEach(alerta => {
    html += `
      <div class="card">
        <h3>Evidencia: ${alerta.timestamp}</h3>
        <video controls><source src="${alerta.video_url}" type="video/mp4"></video>
        <br><br>
        <a href="${alerta.download_url}">📥 DESCARGAR VIDEO</a>
      </div>`;
  });

  html += `</div></body></html>`;
  res.send(html);
});

app.listen(port, () => {
  console.log(`Servidor Argos activo en puerto ${port}`);
});
