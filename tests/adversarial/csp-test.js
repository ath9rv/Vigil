(async function() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillText('CSPTest', 10, 10);
    const firstReadData = canvas.toDataURL();
    
    const digestBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(firstReadData));
    const fingerprintDigest = [...new Uint8Array(digestBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
    
    window.__VIGIL_TEST_RESULT__ = {
        name: 'CSP_STRICT',
        canvasReadExecuted: true,
        fingerprintDigest
    };
})();
