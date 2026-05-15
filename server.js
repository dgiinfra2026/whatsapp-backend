const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(cors()); // Permite que o GitHub Pages acesse esta API
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 1. Inicialização do Cliente WhatsApp com configurações para o Render
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        // Flags obrigatórias para rodar em servidores Linux como o Render
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

// Exibe o QR Code no terminal (Você vai escanear pelo painel do Render)
client.on('qr', (qr) => {
    console.log('--- ESCANEIE O QR CODE ABAIXO NO SEU WHATSAPP ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado e pronto para enviar mensagens!');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação:', msg);
});

client.initialize();

// 2. Rota que o botão do GitHub Pages vai acionar
// CORRIGIDO: Mudou 'range' para 'res'
app.post('/enviar-ajuda', async (req, res) => {
    const numeros = ['5551989670061', '555130448527'];
    const mensagemAjuda = "🚨 ALERTA: Pedido de ajuda disparado pelo sistema de emergência!";

    try {
        for (let numero of numeros) {
            const chatId = `${numero}@c.us`;
            await client.sendMessage(chatId, mensagemAjuda);
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
