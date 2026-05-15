const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(cors()); 
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Variável de controlo para verificar o estado da conexão
let whatsappPronto = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

client.on('qr', (qr) => {
    console.log('--- ESCANEIE O QR CODE ABAIXO NO SEU WHATSAPP ---');
    qrcode.generate(qr, { small: true });
    whatsappPronto = false; // Se gerou QR Code, ainda não está pronto
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado e pronto para enviar mensagens!');
    whatsappPronto = true; // Conexão estabelecida com sucesso
});

client.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação:', msg);
    whatsappPronto = false;
});

client.on('disconnected', (reason) => {
    console.log('❌ WhatsApp foi desconectado:', reason);
    whatsappPronto = false;
});

client.initialize();

// Rota de Emergência
app.post('/enviar-ajuda', async (req, res) => {
    // 1. Validação de Segurança: Se não estiver conectado, não tenta enviar
    if (!whatsappPronto) {
        return res.status(503).json({ 
            status: "Erro", 
            detalhe: "O servidor do WhatsApp não está conectado. Certifique-se de que escaneou o QR Code nos logs do Render." 
        });
    }

    const numeros = ['5551989670061', '555130448527'];
    const mensagemAjuda = "🚨 ALERTA: Pedido de ajuda disparado pelo sistema de emergência!";

    try {
        for (let numero of numeros) {
            const chatId = `${numero}@c.us`;
            await client.sendMessage(chatId, mensajeAjuda);
            console.log(`Mensagem enviada para: ${numero}`);
        }
        return res.status(200).json({ status: "Sucesso", message: "Alertas enviados!" });
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        return res.status(500).json({ status: "Erro", detalhe: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
