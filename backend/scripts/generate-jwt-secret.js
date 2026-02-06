/**
 * Generador de JWT_SECRET seguro
 * Genera un secret de 64 bytes (128 caracteres hexadecimales)
 */

const crypto = require('crypto');

console.log('\n🔐 GENERADOR DE JWT_SECRET SEGURO\n');
console.log('='.repeat(80));

// Generar 3 secrets para que el usuario elija
console.log('\nAquí tienes 3 secrets únicos (64 bytes = 128 caracteres hex):\n');

for (let i = 1; i <= 3; i++) {
    const secret = crypto.randomBytes(64).toString('hex');
    console.log(`SECRET ${i}:`);
    console.log(secret);
    console.log('');
}

console.log('='.repeat(80));
console.log('\n📋 INSTRUCCIONES:\n');
console.log('1. Copia UNO de los secrets de arriba');
console.log('2. En Render Dashboard → Environment → Add variable:');
console.log('   - Key: JWT_SECRET');
console.log('   - Value: [pega el secret copiado]');
console.log('3. Guarda los cambios (Render redesplegará automáticamente)');
console.log('\n⚠️  IMPORTANTE:');
console.log('   - Usa un secret DIFERENTE para producción vs desarrollo');
console.log('   - NO compartas este secret públicamente');
console.log('   - Guárdalo en un lugar seguro (1Password, LastPass, etc.)');
console.log('\n');
