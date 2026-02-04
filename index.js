const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const app = express();

// ESTO ES VITAL: Permite que el servidor reciba los datos del video
app.use(express.raw({ type: () => true, limit: '100mb' }));

// Tu conexión de Supabase (la misma de antes)
const supabase = createClient("TU_URL", "TU_KEY");

// RUTA PARA EL DASHBOARD (La que el Cron Job despierta)
app.get(['/', '/index.html'], (req, res) => {
    res.send("DASHBOARD ONLINE - ESPERANDO VIDEO");
});

// RUTA PARA EL VIDEO (La que el ESP32 busca)
// IMPORTANTE: Pusimos /receptor aquí
app.post('/receptor', async (req, res) => {
    console.log("🔔 ¡LLEGÓ UN VIDEO AL SERVIDOR INSTITUCIONAL!");
    // ... aquí va todo el código de subida a Supabase que te pasé antes ...
    res.status(200).send("RECIBIDO EN INSTITUCIONAL");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
