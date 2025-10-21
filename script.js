// ===================================================
// VARIÁVEIS DE ESTADO E PERSISTÊNCIA (LOCALSTORAGE)
// ===================================================
let estoque = JSON.parse(localStorage.getItem('estoque')) || [];
let historico = JSON.parse(localStorage.getItem('historico')) || [];
let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
let usuarioLogado = localStorage.getItem('usuarioLogado') || null;

const MAX_USUARIOS = 10; 
const TIMEOUT_NOTIFICACAO = 3000;

// USUÁRIO EXCLUSIVO PARA INVENTÁRIO (Master)
const USUARIO_MASTER_INVENTARIO = {
    username: "admin",
    password: "455596" 
};

// Elementos do DOM
const loginScreen = document.getElementById('login-screen');
const mainContent = document.getElementById('main-content'); 
const appPages = document.querySelectorAll('.app-page'); 
const statusCadastro = document.getElementById('status-cadastro');
const notificationArea = document.getElementById('notification-area');

const tabelaEstoque = document.getElementById('tabelaEstoque');
const selecaoProduto = document.getElementById('selecaoProduto');
const selecaoProdutoInventario = document.getElementById('selecaoProdutoInventario');
const listaHistoricoCompleto = document.getElementById('listaHistoricoCompleto'); // NOVO ID
const filtroOperacao = document.getElementById('filtroOperacao'); 
const mainNav = document.getElementById('main-nav');
const usuarioLogadoNome = document.getElementById('usuarioLogadoNome');

// Novos Elementos para Gerenciamento/Busca e Histórico de Inventário
const tabelaBuscaGerenciamento = document.getElementById('tabelaBuscaGerenciamento');
const listaHistoricoInventario = document.getElementById('listaHistoricoInventario'); 
const inputBuscaProduto = document.getElementById('inputBuscaProduto');

// Links e Tabelas
const inventarioLink = document.getElementById('inventario-link');
const gestaoUsuariosLink = document.getElementById('gestao-usuarios-link'); 
const tabelaUsuarios = document.getElementById('tabelaUsuarios');           

// Inputs de inventário
const quantidadeInventariadaInput = document.getElementById('quantidadeInventariadaInput');


// Função para salvar dados no localStorage
function salvarDados() {
    localStorage.setItem('estoque', JSON.stringify(estoque));
    localStorage.setItem('historico', JSON.stringify(historico));
    localStorage.setItem('usuarios', JSON.stringify(usuarios)); 
    localStorage.setItem('usuarioLogado', usuarioLogado);
}

// ===================================================
// UX: FUNÇÕES DE NOTIFICAÇÃO E UTILS
// ===================================================

/**
 * Exibe uma notificação no topo da tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {('success'|'error'|'info'|'warning')} type - O tipo de notificação.
 */
function showNotification(message, type) {
    if (!notificationArea) return;
    
    // Limpa classes e esconde para garantir que a transição seja suave
    notificationArea.className = 'notification hidden';
    
    // Configura a nova notificação
    notificationArea.textContent = message;
    notificationArea.classList.remove('hidden');
    notificationArea.classList.add(type);
    
    // Esconde a notificação após o timeout
    setTimeout(() => {
        notificationArea.classList.add('hidden');
    }, TIMEOUT_NOTIFICACAO);
}

function toggleMenu() {
    if (mainNav) {
        mainNav.classList.toggle('hidden');
    }
}

/** Checa se o usuário é o master e exibe/esconde os links e botões restritos. */
function checarPermissoesMenu() {
    const isMaster = usuarioLogado && usuarioLogado.toLowerCase() === USUARIO_MASTER_INVENTARIO.username.toLowerCase();

    // Menu Sanduíche Links
    if (inventarioLink) {
        inventarioLink.classList.toggle('hidden', !isMaster);
    }
    if (gestaoUsuariosLink) {
        gestaoUsuariosLink.classList.toggle('hidden', !isMaster);
    }
}

/** * Implementa a verificação de permissão e troca de telas.
 * @param {('opcoes-iniciais'|'adicionar-produto-apenas'|'visualizar-movimentar'|'inventario'|'gestao-usuarios'|'gerenciar-produtos'|'historico-completo')} page - O ID da página (sem o '-page').
 */
function navegarPara(page) {
    // Fecha o menu ao navegar
    if (mainNav) {
        mainNav.classList.add('hidden'); 
    }
    
    const isMaster = usuarioLogado && usuarioLogado.toLowerCase() === USUARIO_MASTER_INVENTARIO.username.toLowerCase();
    
    // VERIFICAÇÃO DE PERMISSÃO PARA INVENTÁRIO E GESTÃO
    if ((page === 'inventario' || page === 'gestao-usuarios') && !isMaster) {
        showNotification('Acesso Negado: Esta página é restrita ao usuário Master.', 'error');
        page = 'opcoes-iniciais'; 
    }
    
    // Esconde TODAS as páginas da aplicação
    if (appPages) {
        appPages.forEach(p => p.classList.add('hidden'));
    }
    
    // Mostra a página correta
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) {
        targetPage.classList.remove('hidden');
        
        // Atualiza elementos críticos
        if (page === 'visualizar-movimentar') {
            atualizarTabela();
            atualizarListaProdutosMovimento(); 
        }
        if (page === 'inventario') {
            atualizarListaProdutosMovimento(); 
            atualizarHistoricoInventario(); // Histórico Restrito
        }
        if (page === 'gestao-usuarios') { 
            renderizarTabelaUsuarios();
        }
        if (page === 'gerenciar-produtos') { 
             filtrarProdutosGerenciamento();
             // Esconde o card de edição ao entrar na página
             document.getElementById('editar-produto-card').classList.add('hidden');
        }
        if (page === 'historico-completo') {
            // Reutiliza a função de histórico completo (com filtro)
            atualizarHistoricoCompleto();
        }
        
    } else {
        // Fallback caso a página não exista
        const opcoesIniciais = document.getElementById('opcoes-iniciais-page');
        if (opcoesIniciais) {
             opcoesIniciais.classList.remove('hidden');
        }
    }
}

function formatarData(dataString) {
    if (!dataString) return 'N/A';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
}

function formatarDataHora(dataString) {
    if (!dataString) return 'N/A';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', {
        hour: '2-digit', 
        minute: '2-digit' 
    });
}


// ===================================================
// FUNÇÕES DE LOGIN/CADASTRO E GESTÃO DE USUÁRIOS
// ===================================================

function garantirUsuarioMaster() {
    const masterExists = usuarios.some(u => 
        (u.username || '').toLowerCase() === USUARIO_MASTER_INVENTARIO.username.toLowerCase()
    );

    if (!masterExists) {
        if (usuarios.length < MAX_USUARIOS) {
             usuarios.push(USUARIO_MASTER_INVENTARIO);
             salvarDados();
        } 
    }
}


function fazerCadastro() {
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;

    if (usuarios.length >= MAX_USUARIOS) {
        showNotification(`Limite de ${MAX_USUARIOS} usuários atingido.`, 'error');
        return;
    }

    if (!username || !password) {
        showNotification('Preencha nome de usuário e senha para o cadastro.', 'error');
        return;
    }

    if (usuarios.some(u => (u.username || '').toLowerCase() === username.toLowerCase())) {
        showNotification('Nome de usuário já existe.', 'error');
        return;
    }
    
    if (username.toLowerCase() === USUARIO_MASTER_INVENTARIO.username.toLowerCase()) {
        showNotification('Nome de usuário reservado.', 'error');
        return;
    }
    
    const novoUsuario = { username, password }; 
    usuarios.push(novoUsuario);
    salvarDados(); 

    document.getElementById('registerUsername').value = '';
    document.getElementById('registerPassword').value = '';

    if (statusCadastro) {
        statusCadastro.textContent = `Usuário "${username}" cadastrado! Total: ${usuarios.length}/${MAX_USUARIOS}`;
        statusCadastro.style.color = '#28a745';
    }
    showNotification(`Usuário "${username}" cadastrado com sucesso!`, 'success');
}

function fazerLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    const usuarioEncontrado = usuarios.find(u => 
        (u.username || '').toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (usuarioEncontrado) {
        usuarioLogado = usuarioEncontrado.username;
        salvarDados();
        verificarLogin(); 
        showNotification(`Bem-vindo, ${usuarioLogado}!`, 'success');
    } else {
        showNotification('Usuário ou senha incorretos. Tente novamente.', 'error');
    }
}

function fazerLogout() {
    usuarioLogado = null;
    salvarDados();
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    verificarLogin(); 
    showNotification('Você foi desconectado.', 'info');
}

function verificarLogin() {
    garantirUsuarioMaster();
    
    if (usuarioLogado && mainContent && loginScreen) {
        loginScreen.classList.add('hidden');
        mainContent.classList.remove('hidden'); 
        if (usuarioLogadoNome) {
             usuarioLogadoNome.textContent = usuarioLogado;
        }
        
        navegarPara('opcoes-iniciais'); 
        checarPermissoesMenu();
        
        atualizarTabela(); 
        atualizarListaProdutosMovimento();
        
    } else if (loginScreen) {
        loginScreen.classList.remove('hidden');
        if (mainContent) {
            mainContent.classList.add('hidden');
        }
        if (statusCadastro) {
            statusCadastro.textContent = `Usuários cadastrados: ${usuarios.length}/${MAX_USUARIOS}`;
            statusCadastro.style.color = '#007bff';
        }
        checarPermissoesMenu(); 
    }
}

/** * Renderiza a tabela de usuários na página de Gestão. */
function renderizarTabelaUsuarios() {
    if (!tabelaUsuarios) return;
    tabelaUsuarios.innerHTML = '';

    const usuarioMasterNome = USUARIO_MASTER_INVENTARIO.username.toLowerCase();

    usuarios.forEach(user => {
        const row = tabelaUsuarios.insertRow();
        const usernameLower = user.username.toLowerCase();

        const isMaster = usernameLower === usuarioMasterNome;
        
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${isMaster ? 'Master/Administrador' : 'Padrão'}</td>
            <td>
                ${isMaster 
                    ? '<button class="btn-inventario" disabled>Não Excluir</button>' 
                    : `<button class="btn-saida" onclick="excluirUsuario('${user.username}')">Excluir</button>`
                }
            </td>
        `;
    });
}

/**
 * Exclui um usuário (apenas Master pode chamar).
 * @param {string} username - O nome do usuário a ser excluído.
 */
function excluirUsuario(username) {
    if (usuarioLogado.toLowerCase() !== USUARIO_MASTER_INVENTARIO.username.toLowerCase()) {
        showNotification('Erro de Permissão: Apenas o Master pode excluir usuários.', 'error');
        return;
    }
    
    const usernameLower = username.toLowerCase();
    
    if (usernameLower === USUARIO_MASTER_INVENTARIO.username.toLowerCase() || usernameLower === usuarioLogado.toLowerCase()) {
        showNotification('Não é possível excluir o usuário Master ou o usuário logado.', 'error');
        return;
    }

    const index = usuarios.findIndex(u => (u.username || '').toLowerCase() === usernameLower);

    if (index !== -1) {
        if (confirm(`Tem certeza que deseja excluir o usuário "${username}"?`)) {
            usuarios.splice(index, 1);
            salvarDados();
            renderizarTabelaUsuarios();
            showNotification(`Usuário "${username}" excluído com sucesso.`, 'success');
        }
    } else {
        showNotification('Usuário não encontrado.', 'error');
    }
}

// ===================================================
// FUNÇÕES DE ESTOQUE E MOVIMENTAÇÃO 
// ===================================================

/** * Atualiza a tabela de estoque na página de Visualização.
 * Retorna: Qtd. Invent. e remove: Status/Conferido (Nova Requisição) 
 */
function atualizarTabela() {
    if (!tabelaEstoque) return; 
    
    tabelaEstoque.innerHTML = ''; 

    estoque.forEach(produto => {
        const row = tabelaEstoque.insertRow();
        
        row.innerHTML = `
            <td>${produto.codigo}</td>
            <td>${produto.nome}</td>
            <td class="numeric-col">${produto.quantidade}</td>
            <td class="numeric-col">${produto.quantidadeInventariada !== undefined ? produto.quantidadeInventariada : 'N/A'}</td> <td class="numeric-col">${produto.gramas !== undefined ? produto.gramas : 'N/A'}</td> 
            <td>${formatarData(produto.dataUltimoInventario)}</td>
            `;
    });
}

/** Atualiza o select de produtos para Movimentação e Inventário. */
function atualizarListaProdutosMovimento() {
    if (!selecaoProduto || !selecaoProdutoInventario) return; 

    // Limpa ambas as listas de seleção
    selecaoProduto.innerHTML = '<option value="">Selecione um Produto</option>'; 
    selecaoProdutoInventario.innerHTML = '<option value="">Selecione o Produto</option>'; 

    estoque.forEach(produto => {
        const option = document.createElement('option');
        option.value = produto.codigo; 
        option.textContent = `[${produto.codigo}] ${produto.nome}`;
        
        const optionInventario = option.cloneNode(true);

        selecaoProduto.appendChild(option);
        selecaoProdutoInventario.appendChild(optionInventario);
    });
}

/** * Atualiza o Histórico COMPLETO (nova página). 
 * Chamado a partir da nova página 'historico-completo-page'.
 */
function atualizarHistoricoCompleto() {
    if (!listaHistoricoCompleto) return; 
    
    listaHistoricoCompleto.innerHTML = ''; 
    const filtro = filtroOperacao.value;

    const historicoFiltrado = historico.filter(item => {
        if (filtro === 'todos') {
            return true;
        } else if (filtro === 'Inventário') {
            return item.operacao.includes('Inventário');
        } else {
            return item.operacao === filtro;
        }
    });

    [...historicoFiltrado].reverse().forEach(item => { 
        const row = listaHistoricoCompleto.insertRow();
        let tipo = item.operacao;
        let quantidadeExibida = item.quantidade;
        let classeCor = '';
        
        if (tipo === 'Entrada' || tipo === 'Adição Inicial') {
            classeCor = 'entrada-row';
            tipo = 'Entrada';
        } else if (tipo === 'Saída') {
            classeCor = 'saida-row';
        } else if (tipo.includes('Inventário')) {
            classeCor = 'inventario-row';
            // Para exibição, usamos a diferença no histórico de Inventário
            quantidadeExibida = item.diferenca !== undefined ? (item.diferenca > 0 ? `+${item.diferenca}` : item.diferenca) : '0';
            tipo = 'Inventário';
        }

        row.classList.add(classeCor);

        const codigoDisplay = item.codigo ? ` (${item.codigo})` : '';
        const saldoFinal = item.quantidadeAtual !== undefined ? item.quantidadeAtual : item.quantidade;

        row.innerHTML = `
            <td>${formatarDataHora(item.data)}</td>
            <td>${item.usuario}</td>
            <td>${tipo}</td>
            <td>${item.produto}${codigoDisplay}</td>
            <td style="text-align: right;">${quantidadeExibida}</td>
            <td style="text-align: right;">${saldoFinal}</td>
        `;
    });
}

/** * Atualiza o Histórico de Inventário (apenas Entrada e Inventário). 
 * Mantido na página 'inventario-page'.
 */
function atualizarHistoricoInventario() {
    if (!listaHistoricoInventario) return; 
    
    listaHistoricoInventario.innerHTML = ''; 

    // Filtra para incluir apenas Entradas, Adição Inicial e Inventário. Exclui Saídas.
    const historicoFiltrado = historico.filter(item => {
        return item.operacao === 'Entrada' || 
               item.operacao.includes('Inventário') || 
               item.operacao === 'Adição Inicial';
    });

    [...historicoFiltrado].reverse().forEach(item => { 
        const row = listaHistoricoInventario.insertRow();
        let tipo = item.operacao;
        let quantidadeExibida = item.quantidade;
        let classeCor = '';
        
        if (tipo === 'Entrada' || tipo === 'Adição Inicial') {
            classeCor = 'entrada-row';
            tipo = 'Entrada';
            quantidadeExibida = item.quantidade; // Exibe a Qtd de entrada
        } else if (tipo.includes('Inventário')) {
            classeCor = 'inventario-row';
            // Para exibição, usamos a diferença no histórico de Inventário
            quantidadeExibida = item.diferenca !== undefined ? (item.diferenca > 0 ? `+${item.diferenca}` : item.diferenca) : '0';
            tipo = 'Inventário';
        } else {
            return; // Garante que Saídas (e outras operações não filtradas) não apareçam
        }

        row.classList.add(classeCor);

        const codigoDisplay = item.codigo ? ` (${item.codigo})` : '';
        const saldoFinal = item.quantidadeAtual !== undefined ? item.quantidadeAtual : item.quantidade;

        row.innerHTML = `
            <td>${formatarDataHora(item.data)}</td>
            <td>${item.usuario}</td>
            <td>${tipo}</td>
            <td>${item.produto}${codigoDisplay}</td>
            <td style="text-align: right;">${quantidadeExibida}</td>
            <td style="text-align: right;">${saldoFinal}</td>
        `;
    });
}


function adicionarProduto() {
    const codigo = document.getElementById('codigoProduto').value.trim(); 
    const nome = document.getElementById('nomeProduto').value.trim();
    const quantidadeStr = document.getElementById('quantidadeInicial').value;
    
    const gramasStr = document.getElementById('gramasProduto').value;
    const observacao = document.getElementById('observacaoProduto').value.trim();
    const gramas = parseFloat(gramasStr) || 0; 
    
    const quantidade = parseInt(quantidadeStr) || 0; 

    if (!codigo || !nome || isNaN(quantidade) || quantidade < 0) {
        showNotification('Preencha o Código, o Nome do produto e uma Quantidade válida.', 'error');
        return;
    }
    
    if (estoque.some(p => (p.codigo || '').toLowerCase() === codigo.toLowerCase())) {
        showNotification(`Código de Produto "${codigo}" já existe no estoque!`, 'error');
        return;
    }

    const novoProduto = { 
        codigo: codigo, 
        nome: nome, 
        quantidade: quantidade,
        
        // Incluído para a nova coluna, valor inicial é o estoque atual
        quantidadeInventariada: quantidade, 
        
        gramas: gramas,
        observacao: observacao,
        valorCalculado: 0, 
        
        // Data de Inventário inicial
        dataUltimoInventario: new Date()
    };
    estoque.push(novoProduto);

    const registro = {
        data: new Date(),
        operacao: 'Adição Inicial',
        produto: nome,
        codigo: codigo, 
        quantidade: quantidade,
        quantidadeAtual: quantidade,
        usuario: usuarioLogado 
    };
    historico.push(registro);

    salvarDados();
    atualizarTabela();
    atualizarHistoricoCompleto();
    atualizarListaProdutosMovimento(); 

    document.getElementById('codigoProduto').value = '';
    document.getElementById('nomeProduto').value = '';
    document.getElementById('quantidadeInicial').value = '0';
    document.getElementById('gramasProduto').value = '0'; 
    document.getElementById('observacaoProduto').value = '';

    showNotification(`Produto [${codigo}] "${nome}" adicionado com sucesso!`, 'success');
}

function realizarMovimento(tipo) {
    const codigoProduto = document.getElementById('selecaoProduto').value;
    const quantidadeMovimentoStr = document.getElementById('quantidadeMovimento').value;
    
    const quantidadeMovimento = parseInt(quantidadeMovimentoStr);

    if (!codigoProduto || isNaN(quantidadeMovimento) || quantidadeMovimento <= 0) {
        showNotification('Selecione um produto e insira uma quantidade de movimento válida (> 0).', 'error');
        return;
    }

    const produto = estoque.find(p => p.codigo === codigoProduto);

    if (produto) {
        let novaQuantidade = produto.quantidade;
        let operacaoDetalhe = '';

        if (tipo === 'entrada') {
            novaQuantidade += quantidadeMovimento;
            operacaoDetalhe = 'Entrada';
        } else if (tipo === 'saida') {
            if (produto.quantidade < quantidadeMovimento) {
                showNotification(`Estoque (${produto.quantidade}) de [${produto.codigo}] é insuficiente para a saída de ${quantidadeMovimento}.`, 'error');
                return;
            }
            novaQuantidade -= quantidadeMovimento;
            operacaoDetalhe = 'Saída';
        }

        produto.quantidade = novaQuantidade;
        
        const registro = {
            data: new Date(),
            operacao: operacaoDetalhe,
            produto: produto.nome,
            codigo: produto.codigo, 
            quantidade: quantidadeMovimento,
            quantidadeAtual: novaQuantidade,
            usuario: usuarioLogado
        };
        historico.push(registro);

        salvarDados();
        atualizarTabela();
        atualizarHistoricoCompleto();
        atualizarHistoricoInventario(); // Pode ter impacto no saldo do histórico restrito
        atualizarListaProdutosMovimento(); 
        
        document.getElementById('quantidadeMovimento').value = '';

        showNotification(`Movimento de ${operacaoDetalhe} realizado em [${produto.codigo}]!`, 'success');
    } else {
        showNotification('Erro: Produto não encontrado.', 'error');
    }
}

function realizarInventario() {
    const codigoProduto = document.getElementById('selecaoProdutoInventario').value;
    const contagemFisicaStr = quantidadeInventariadaInput.value;
    
    const contagemFisica = parseInt(contagemFisicaStr);

    if (!codigoProduto || isNaN(contagemFisica) || contagemFisica < 0) {
        showNotification('Selecione um produto e insira a contagem física válida (>= 0).', 'error');
        return;
    }

    const produto = estoque.find(p => p.codigo === codigoProduto);

    if (produto) {
        const quantidadeAtualAntiga = produto.quantidade;
        const diferenca = contagemFisica - quantidadeAtualAntiga;
        
        // Salva a contagem física para a coluna Qtd. Invent.
        produto.quantidadeInventariada = contagemFisica; 
        
        // Ajusta o estoque e atualiza a data
        produto.dataUltimoInventario = new Date(); 
        produto.quantidade = contagemFisica; 
        
        let operacaoDetalhe;
        
        if (diferenca !== 0) {
            operacaoDetalhe = 'Inventário (Ajuste)';
            showNotification(`Inventário realizado. Estoque de [${produto.codigo}] ajustado para ${contagemFisica} unidades (diferença: ${diferenca}).`, 'warning');
        } else {
            operacaoDetalhe = 'Inventário (Conferência OK)';
            showNotification(`Inventário realizado. Estoque de [${produto.codigo}] está correto.`, 'success');
        }

        const registro = {
            data: new Date(),
            operacao: operacaoDetalhe,
            produto: produto.nome,
            codigo: produto.codigo,
            quantidadeAtual: produto.quantidade,
            diferenca: diferenca, 
            usuario: usuarioLogado
        };
        historico.push(registro);

        salvarDados();
        atualizarTabela();
        atualizarHistoricoCompleto(); 
        atualizarHistoricoInventario(); 
        atualizarListaProdutosMovimento(); 
        
        quantidadeInventariadaInput.value = '';

    } else {
        showNotification('Erro: Produto não encontrado para inventário.', 'error');
    }
}

// ===================================================
// FUNÇÕES DE EDIÇÃO DE PRODUTO (REQUISIÇÕES)
// ===================================================

/**
 * Filtra e exibe a lista de produtos na página de Gerenciamento.
 */
function filtrarProdutosGerenciamento() {
    if (!tabelaBuscaGerenciamento || !inputBuscaProduto) return;
    
    tabelaBuscaGerenciamento.innerHTML = '';
    const termo = inputBuscaProduto.value.toLowerCase().trim();

    const produtosFiltrados = estoque.filter(produto => 
        (produto.codigo || '').toLowerCase().includes(termo) || 
        (produto.nome || '').toLowerCase().includes(termo)
    );

    produtosFiltrados.forEach(produto => {
        const row = tabelaBuscaGerenciamento.insertRow();
        row.innerHTML = `
            <td>${produto.codigo}</td>
            <td>${produto.nome}</td>
            <td>
                <button class="btn-info" onclick="iniciarEdicao('${produto.codigo}')" title="Editar Produto">
                    <i class="fa fa-edit"></i> Editar
                </button>
            </td>
        `;
    });
}

/**
 * Inicia o processo de edição, carregando os dados do produto, e exibe o card.
 * (Abertura total do item na tela garantida pela remoção de classes 'hidden' e ajustes de CSS)
 * @param {string} codigo - O código do produto a ser editado.
 */
function iniciarEdicao(codigo) {
    const produto = estoque.find(p => p.codigo === codigo);

    if (!produto) {
        showNotification('Erro: Produto não encontrado para edição.', 'error');
        return;
    }

    // Mostra o card de edição 
    const editarCard = document.getElementById('editar-produto-card');
    editarCard.classList.remove('hidden'); 
    
    // Rola a tela para garantir que o formulário de edição seja visível, 
    // garantindo que "o item se abra por completo na tela" (Nova Requisição)
    editarCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Preenche os campos de edição
    document.getElementById('produtoSendoEditadoNome').textContent = produto.nome;
    document.getElementById('editCodigoOriginal').value = produto.codigo; 
    document.getElementById('editCodigoProduto').value = produto.codigo;
    document.getElementById('editNomeProduto').value = produto.nome;
    
    // Gramas e Observação
    document.getElementById('editGramasProduto').value = produto.gramas || 0;
    document.getElementById('editObservacaoProduto').value = produto.observacao || '';
    
    // Valor de Cálculo (Divisor)
    document.getElementById('celulaCalculoInput').value = produto.valorCalculado > 0 ? produto.valorCalculado : '';
    
    // Calcula e exibe o valor inicial
    calcularValor();
}

/** * Realiza o cálculo da divisão: Gramas / Valor de Cálculo. */
function calcularValor() {
    const gramasInput = document.getElementById('editGramasProduto').value;
    const divisorInput = document.getElementById('celulaCalculoInput').value;
    const resultadoDisplay = document.getElementById('resultadoCalculoDisplay');
    
    const gramas = parseFloat(gramasInput) || 0;
    const divisor = parseFloat(divisorInput);

    if (divisor > 0 && gramas >= 0) {
        const resultado = divisor / gramas;
        resultadoDisplay.textContent = resultado.toFixed(4).replace('.', ','); // Exibe com 4 casas decimais e usa vírgula
    } else if (gramas > 0 && (isNaN(divisor) || divisor === 0)) {
        resultadoDisplay.textContent = 'Erro: Divisor deve ser > 0';
    } else {
        resultadoDisplay.textContent = 'N/A';
    }
}


/**
 * Salva as alterações feitas no produto e volta para a tabela.
 */
function salvarEdicaoProduto() {
    const codigoOriginal = document.getElementById('editCodigoOriginal').value;
    const novoCodigo = document.getElementById('editCodigoProduto').value.trim();
    const novoNome = document.getElementById('editNomeProduto').value.trim();
    const novasGramas = parseFloat(document.getElementById('editGramasProduto').value) || 0;
    const novaObservacao = document.getElementById('editObservacaoProduto').value.trim();
    const novoDivisor = parseFloat(document.getElementById('celulaCalculoInput').value) || 0;


    if (!novoCodigo || !novoNome || isNaN(novasGramas) || novasGramas < 0) {
        showNotification('Preencha o Código, Nome e Gramas do produto para salvar.', 'error');
        return;
    }

    // Checa se o novo código já existe (exceto se for o código original)
    const codigoJaExiste = estoque.some(p => 
        (p.codigo || '').toLowerCase() === novoCodigo.toLowerCase() && p.codigo !== codigoOriginal
    );
    
    if (codigoJaExiste) {
        showNotification('Erro: O novo Código de Produto já existe no estoque!', 'error');
        return;
    }

    const produtoIndex = estoque.findIndex(p => p.codigo === codigoOriginal);

    if (produtoIndex !== -1) {
        const produto = estoque[produtoIndex];
        
        // Atualiza os dados
        produto.codigo = novoCodigo;
        produto.nome = novoNome;
        produto.gramas = novasGramas;
        produto.observacao = novaObservacao;
        produto.valorCalculado = novoDivisor;

        salvarDados();
        atualizarTabela();
        atualizarListaProdutosMovimento();
        filtrarProdutosGerenciamento(); 
        
        // Esconde o formulário de edição
        document.getElementById('editar-produto-card').classList.add('hidden'); 

        showNotification(`Produto [${novoCodigo}] salvo com sucesso!`, 'success');
    } else {
        showNotification('Erro: Produto original não encontrado para salvar.', 'error');
    }
}

/**
 * Exclui um produto do estoque.
 */
function excluirProduto() {
    const codigoOriginal = document.getElementById('editCodigoOriginal').value;

    if (!codigoOriginal) return;

    if (confirm(`ATENÇÃO: Tem certeza que deseja EXCLUIR o produto [${codigoOriginal}] e TODO o seu histórico de movimentos? Esta ação é irreversível.`)) {
        // Remove do Estoque
        const estoqueAntes = estoque.length;
        estoque = estoque.filter(p => p.codigo !== codigoOriginal);
        
        // Remove do Histórico
        historico = historico.filter(h => h.codigo !== codigoOriginal);

        salvarDados();

        if (estoque.length < estoqueAntes) {
            // Atualiza todas as visualizações relevantes
            atualizarTabela();
            atualizarHistoricoCompleto();
            atualizarHistoricoInventario();
            atualizarListaProdutosMovimento();
            filtrarProdutosGerenciamento();

            // Esconde o formulário de edição
            document.getElementById('editar-produto-card').classList.add('hidden'); 
            showNotification(`Produto [${codigoOriginal}] excluído com sucesso!`, 'success');
        } else {
            showNotification('Erro: Produto não encontrado para exclusão.', 'error');
        }
    }
}


// ==================================================
// Inicializa a aplicação ao carregar a página
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
    verificarLogin();
    
    // Adiciona o ouvinte de evento para fechar o menu ao clicar fora
    document.addEventListener('click', (event) => {
        const mainNav = document.getElementById('main-nav');
        const menuIcon = document.getElementById('menu-icon');

        // Verifica se o clique foi dentro do menu ou dentro do ícone que o abre
        const isClickInsideMenu = mainNav && mainNav.contains(event.target);
        const isClickOnIcon = menuIcon && menuIcon.contains(event.target);
        
        // Se o menu estiver visível (não tem a classe 'hidden')
        if (mainNav && !mainNav.classList.contains('hidden')) {
            // E o clique não foi no menu, nem no ícone 
            if (!isClickInsideMenu && !isClickOnIcon) {
                mainNav.classList.add('hidden'); // Fecha o menu
            }
        }
    });
});