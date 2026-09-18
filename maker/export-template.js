// export-template.js - SUBMÓDULO DE MAQUETACIÓN HTML5 DEL JUEGO EXPORTADO
function buildExportHTMLTemplate(runtimeScript) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aventura KOREH</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            user-select: none;
            -webkit-font-smoothing: antialiased;
        }
        body {
            background-color: #000000;
            color: #1d1d1f;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            height: 100vh;
            width: 100vw;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        }
        #viewport-container {
            width: 100vw;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            cursor: default;
            background: #000;
            overflow: hidden;
            perspective: 1200px;
            perspective-origin: 50% 50%;
        }
        #stage {
            background: #ffffff;
            position: absolute;
            overflow: visible;
            transform-origin: 0 0;
            transform-style: preserve-3d;
        }
        #stage.is-mode-7 {
            transform-style: preserve-3d;
            background: transparent !important;
        }
        .mode7-ground {
            transform-style: preserve-3d;
            transform-origin: center center;
        }
        .mode7-billboard {
            transform-origin: bottom center !important;
            transform-style: preserve-3d;
        }
        .stage-element {
            position: absolute;
            transform-origin: bottom center;
        }
        .stage-element.text-element {
            display: flex;
            align-items: center;
            justify-content: center;
            word-break: break-word;
            white-space: pre-wrap;
            line-height: 1.2;
        }
        .stage-element img {
            width: 100%;
            height: 100%;
            pointer-events: none;
            display: block;
            object-fit: fill;
        }
        #game-ui {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 100000;
            display: block;
        }
        #view-toggle-btn {
            position: absolute;
            top: 16px;
            left: 16px;
            pointer-events: auto;
            z-index: 100001;
            background: rgba(0, 0, 0, 0.75);
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            padding: 8px 14px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: all 0.2s ease;
        }
        #view-toggle-btn:hover {
            background: rgba(0, 0, 0, 0.9);
            transform: scale(1.04);
            border-color: rgba(255, 255, 255, 0.5);
        }
        #view-toggle-btn.active {
            background: #0071e3;
            border-color: rgba(255, 255, 255, 0.4);
        }
        #dialog-box {
            position: absolute;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            width: 75%;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(30px);
            -webkit-backdrop-filter: blur(30px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            border-radius: 16px;
            padding: 20px;
            color: #1d1d1f;
            font-size: 14px;
            line-height: 1.5;
            pointer-events: auto;
            display: none;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.15);
        }
        .btn {
            background: #0071e3;
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            float: right;
            margin-top: 12px;
        }
        #inventory-bar {
            position: absolute;
            top: 16px;
            right: 16px;
            display: flex;
            align-items: center;
            flex-direction: row-reverse;
            gap: 10px;
            pointer-events: auto;
            z-index: 100000;
        }
        .inv-toggle-btn {
            position: relative;
            width: 42px;
            height: 42px;
            border-radius: 12px;
            background: #000000;
            border: none;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
            transition: transform 0.2s ease;
            flex-shrink: 0;
        }
        .inv-toggle-btn:hover {
            transform: scale(1.05);
        }
        .inv-total-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            background: #ff3b30;
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            min-width: 18px;
            height: 18px;
            border-radius: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
            border: 2px solid #000000;
        }
        .inv-drawer {
            display: flex;
            align-items: center;
            gap: 8px;
            max-width: 0;
            opacity: 0;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 0;
            border-radius: 14px;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            transition: all 0.3s ease;
            white-space: nowrap;
            scrollbar-width: none;
        }
        .inv-drawer::-webkit-scrollbar {
            display: none;
        }
        .inv-drawer.open {
            max-width: 400px;
            opacity: 1;
            padding: 6px 10px;
        }
        .inv-slot {
            position: relative;
            min-width: 38px;
            width: 38px;
            height: 38px;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .inv-slot img {
            max-width: 75%;
            max-height: 75%;
            object-fit: contain;
        }
        .inv-badge {
            position: absolute;
            bottom: -2px;
            right: -2px;
            background: #0071e3;
            color: #ffffff;
            font-size: 8px;
            font-weight: 700;
            padding: 2px 4px;
            border-radius: 4px;
        }
        .inv-placeholder {
            font-size: 9px;
            font-weight: 700;
            color: #ffffff;
        }
        .inv-empty-msg {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.6);
            padding: 0 8px;
        }
        #fade-overlay {
            position: absolute;
            inset: 0;
            background: #000000;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.4s ease;
            z-index: 200000;
        }
    </style>
</head>
<body>
    <div id="viewport-container">
        <div id="stage"></div>
        <div id="game-ui">
            <button id="view-toggle-btn" onclick="togglePerspectiveMode()">Modo: 2D</button>
            <div id="inventory-bar"></div>
            <div id="dialog-box">
                <p id="dialog-text"></p>
            </div>
        </div>
        <div id="fade-overlay"></div>
    </div>
    <script>
    ` + runtimeScript + `
    </script>
</body>
</html>`;
}