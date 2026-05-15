const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
app.use(cors()); 
app.use(express.json());

const PORT = process.env.PORT || 3000;

let whatsappStatus = "DESCONECTADO"; // DESCONECTADO, AGUARDANDO_CODIGO, CONECTADO
let pairingCode = null;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        // Otimizações críticas para o Render não estourar os 512MB de RAM
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ]
    }
});

// Se o WhatsApp pedir autenticação, avisamos o frontend
client.on('qr', (qr) => {
    whatsappStatus = "AGUARDANDO_CODIGO";
    console.log('⚠️ WhatsApp aguardando conexão por número de telefone ou QR.');
});

client.on('ready', () => {
    console.log('✅ WhatsApp totalmente conectado e pronto!');
    whatsappStatus = "CONECTADO";
    pairingCode = null;
});

client.on('disconnected', () => {
    whatsappStatus = "DESCONECTADO";
    pairingCode = null;
});

client.initialize();

// ROTA 1: Verifica se já tem número logado e o estado atual
app.get('/status', async (req, res) => {
    try {
        // Tenta checar o estado real do cliente no WhatsApp Web
        const state = await client.getState().catch(() => null);
        if (state === "CONNECTED") {
            whatsappStatus = "CONECTADO";
        }
    } catch (e) {
        // Ignora erros se ainda não iniciou
    }

    return res.json({ 
        status: whatsappStatus,
        codigo: pairingCode
    });
});

// ROTA 2: Solicita o código de 8 dígitos para o número enviado pelo usuário
app.post('/gerar-codigo', async (req, res) => {
    const { numero } = req.body; // Ex: 55519XXXXXXXX
    
    if (!numero) {
        return res.status(400).json({ error: "Número de telefone obrigatório." });
    }

    if (whatsappStatus === "CONECTADO") {
        return res.json({ status: "CONECTADO", msg: "Já existe um número ativo!" });
    }

    try {
        console.log(`Gerando código de pareamento para: ${numero}`);
        // Método nativo do whatsapp-web.js para obter o código de 8 dígitos
        const code = await client.requestPairingCode(numero);
        pairingCode = code;
        whatsappStatus = "AGUARDANDO_CODIGO";
        return res.json({ status: whatsappStatus, codigo: code });
    } catch (error) {
        console.error("Erro ao gerar código:", error);
        return res.status(500).json({ error: "Falha ao gerar código de pareamento.", detalhe: error.message });
    }
});

// ROTA 3: Enviar Mensagem de Emergência
// Rota de disparo atualizada e protegida contra o erro do 9º dígito
app.post('/enviar-ajuda', async (req, res) => {
    if (whatsappStatus !== "CONECTADO") {
        return res.status(503).json({ status: "Erro", detalhe: "Nenhum WhatsApp conectado no servidor." });
    }

    const numeros = ['5551989670061', '555130448527'];
    const mensagemAjuda = "🚨 ALERTA: Pedido de ajuda disparado pelo sistema de emergência!";

    try {
        for (let numero of numeros) {
            // SOLUÇÃO: Pergunta ao WhatsApp qual é a ID interna real deste número
            const numberId = await client.getNumberId(numero);
            
            if (numberId) {
                // numberId._serialized já vem formatado perfeitamente (com ou sem o 9)
                await client.sendMessage(numberId._serialized, mensagemAjuda);
                console.log(`Mensagem enviada com sucesso para: ${numero}`);
            } else {
                console.log(`⚠️ O número ${numero} não foi reconhecido pelo WhatsApp.`);
            }
        }
        return res.status(200).json({ status: "Sucesso", message: "Alertas processados com sucesso!" });
    } catch (error) {
        console.error("Erro interno ao disparar mensagens:", error);
        return res.status(500).json({ status: "Erro", detalhe: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor ativo na porta ${PORT}`);
});
