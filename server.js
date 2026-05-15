const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(cors()); 
app.use(express.json());

const PORT = process.env.PORT || 3000;

let whatsappPronto = false;
let codigoQrAtual = null; // Guarda o código mais recente

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

client.on('qr', (qr) => {
    console.log('--- QR CODE GERADO NO TERMINAL ---');
    qrcode.generate(qr, { small: true });
    codigoQrAtual = qr; // Salva o texto do QR Code
    whatsappPronto = false;
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado!');
    whatsappPronto = true;
    codigoQrAtual = null; // Limpa o QR pois já conectou
});

client.on('disconnected', () => {
    whatsappPronto = false;
    codigoQrAtual = null;
});

client.initialize();

// NOVA ROTA: O Frontend vai usar para saber se mostra o botão ou o QR Code
app.get('/status', (req, res) => {
    return res.json({ 
        pronto: whatsappPronto, 
        qr: codigoQrAtual 
    });
});

// Rota de disparo
app.post('/enviar-ajuda', async (req, res) => {
    if (!whatsappPronto) {
        return res.status(503).json({ status: "Erro", detalhe: "WhatsApp desconectado." });
    }

    const numeros = ['5551989670061', '555130448527'];
    const mensagemAjuda = "🚨 ALERTA: Pedido de ajuda disparado pelo sistema de emergência!";

    try {
        for (let numero of numeros) {
            await client.sendMessage(`${numero}@c.us`, mensagemAjuda);
        }
        return res.status(200).json({ status: "Sucesso", message: "Alertas enviados!" });
    } catch (error) {
        return res.status(500).json({ status: "Erro", detalhe: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor na porta ${PORT}`);
});
