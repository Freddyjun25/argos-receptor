<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SISTEMA ARGOS CORE</title>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --azul-argos: #003366;
            --azul-claro: #004a94;
            --verde-stats: #10b981;
            --fondo: #f0f2f5;
            --texto: #1e293b;
        }
        
        body { font-family: 'Segoe UI', sans-serif; background: var(--fondo); margin: 0; color: var(--texto); }

        header {
            background: #003366;
            color: white; padding: 25px 30px; text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2); position: relative;
        }
        header h1 { margin: 0; font-size: 1.8rem; letter-spacing: 2px; font-weight: 700; text-transform: uppercase; }

        /* EL INDICADOR QUE PEDISTE */
        #ip-display {
            margin-top: 10px;
            font-size: 0.9rem;
            font-weight: 600;
            letter-spacing: 1px;
            color: rgba(255,255,255,0.9);
            text-transform: uppercase;
        }

        .container { max-width: 1200px; margin: 25px auto; padding: 0 20px; }
        
        .toolbar {
            background: white; border-radius: 8px; padding: 15px;
            display: flex; gap: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            margin-bottom: 25px;
        }

        .video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
        
        .card { background: white; border-radius: 12px; overflow: hidden; border: 1px solid #eef2f7; transition: 0.3s; }
        .card-visual { height: 160px; background: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; }
        .card-visual i { font-size: 3rem; }
        
        .card-info { padding: 15px; }
        .card-tag { display: inline-block; background: #f0fdf4; color: #10b981; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 800; margin-bottom: 10px; }
        .card-title { font-size: 0.9rem; margin: 0 0 10px; color: var(--azul-argos); font-weight: 700; word-break: break-all; }

        .btn-download { 
            background: var(--azul-argos); color: white; text-decoration: none; 
            padding: 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 800;
            display: flex; align-items: center; justify-content: center; gap: 8px; flex: 1;
        }
        .btn-delete { background: #fff; color: #ef4444; border: 1px solid #fee2e2; padding: 10px; border-radius: 6px; cursor: pointer; }

        .status-online { color: #10b981; }
        .status-offline { color: #ff4444; }
    </style>
</head>
<body>

    <header>
        <h1>SISTEMA ARGOS CORE</h1>
        <div id="ip-display"><i class="fas fa-sync fa-spin"></i> DETECTANDO ESTADO...</div>
    </header>

    <div class="container">
        <div class="toolbar">
            <input type="text" id="searchInput" placeholder="Buscar video..." onkeyup="filtrar()" style="flex: 1; padding:10px; border-radius:6px; border:1px solid #ddd;">
            <input type="date" id="dateFilter" onchange="filtrar()" style="padding:9px; border-radius:6px; border:1px solid #ddd;">
        </div>

        <div id="main-content" class="video-grid"></div>
    </div>

    <script>
        const URL_SB = "https://evnfyrkpfvlonlfkhbkr.supabase.co";
        const KEY_SB = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2bmZ5cmtwZnZsb25sZmtoYmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzcwMTgsImV4cCI6MjA4NTY1MzAxOH0.jA6qZpOxZkvC2TgoR49knwnlKnsaBQnauhA41-1slUk";
        const BUCKET = "videos-receptor";

        const _supabase = supabase.createClient(URL_SB, KEY_SB);
        let todosLosVideos = [];

        async function cargar() {
            try {
                const { data, error } = await _supabase.storage.from(BUCKET).list('', {
                    limit: 100, sortBy: { column: 'name', order: 'desc' }
                });

                if (error) throw error;

                todosLosVideos = data.filter(f => f.name.toLowerCase().endsWith('.avi') || f.name.toLowerCase().endsWith('.mp4'));

                actualizarCabecera(todosLosVideos);
                renderizar(todosLosVideos);

            } catch (err) {
                console.error(err);
            }
        }

        function actualizarCabecera(videos) {
            const display = document.getElementById('ip-display');
            
            if (videos.length > 0) {
                const ultimo = videos[0]; // El más reciente
                const fechaCarga = new Date(ultimo.created_at);
                const ahora = new Date();
                const diferenciaMinutos = (ahora - fechaCarga) / 1000 / 60;

                // Si el último video se subió hace menos de 15 minutos, consideramos que está ONLINE
                if (diferenciaMinutos < 15) {
                    // Extraemos la IP del nombre del archivo (ej: evidencia_192.168.1.15.avi)
                    const partes = ultimo.name.split('_');
                    // Buscamos algo que parezca una IP en las partes del nombre
                    const ip = partes.find(p => p.includes('.')) || "IP NO DETECTADA";
                    display.innerHTML = `<span class="status-online"><i class="fas fa-network-wired"></i> IP: ${ip.replace('.avi', '').replace('.mp4', '')}</span>`;
                } else {
                    display.innerHTML = `<span class="status-offline"><i class="fas fa-power-off"></i> OFFLINE</span>`;
                }
            } else {
                display.innerHTML = `<span class="status-offline"><i class="fas fa-power-off"></i> OFFLINE</span>`;
            }
        }

        function renderizar(videos) {
            const container = document.getElementById('main-content');
            container.innerHTML = '';

            videos.forEach(file => {
                const { data: urlData } = _supabase.storage.from(BUCKET).getPublicUrl(file.name);
                const card = `
                    <div class="card">
                        <div class="card-visual">
                            <i class="fas fa-file-video"></i>
                            <span style="font-size:0.7rem; font-weight:bold; margin-top:10px;">FORMATO ${file.name.split('.').pop().toUpperCase()}</span>
                        </div>
                        <div class="card-info">
                            <div class="card-tag">CAPTURA SEGURA</div>
                            <h4 class="card-title">${file.name}</h4>
                            <div style="display:flex; gap:10px;">
                                <a href="${urlData.publicUrl}" download target="_blank" class="btn-download">
                                    <i class="fas fa-download"></i> DESCARGAR
                                </a>
                                <button onclick="eliminar('${file.name}')" class="btn-delete">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>`;
                container.innerHTML += card;
            });
        }

        async function eliminar(n) {
            if (confirm("¿Eliminar evidencia?")) {
                await _supabase.storage.from(BUCKET).remove([n]);
                cargar();
            }
        }

        function filtrar() {
            const bus = document.getElementById('searchInput').value.toLowerCase();
            const fil = todosLosVideos.filter(v => v.name.toLowerCase().includes(bus));
            renderizar(fil);
        }

        cargar();
        setInterval(cargar, 30000); // Se actualiza cada 30 segundos
    </script>
</body>
</html>
