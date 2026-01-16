const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'ScanQRPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Reemplazar las líneas problemáticas
content = content.replace(
    /scanner\.render\(onScanSuccess, onScanError\)\s*\.then\([\s\S]*?\.catch\([\s\S]*?\}\);/,
    'scanner.render(onScanSuccess, onScanError);'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Archivo corregido exitosamente');
