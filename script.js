// --- Configuração da API ---
const API_KEY = "AIzaSyClK_YfF9Btn-8RFzDWXKiHckbAw8TzN3o"; // <<< COLOQUE SUA CHAVE DE API AQUI
const MODEL_NAME = "gemini-2.5-flash-preview-05-20";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// --- Elementos do DOM ---
const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const startBtn = document.getElementById("start-btn");
const questionDisplay = document.getElementById("question-display");
const answerButtonsContainer = document.getElementById("answer-buttons");
const answerButtons = document.querySelectorAll(".answer-btn");
const loadingSpinner = document.getElementById("loading-spinner");
const finalGuessArea = document.getElementById("final-guess-area");
const playAgainBtn = document.getElementById("play-again-btn");

// --- Estado do Jogo ---
let chatHistory = [];
let isLoading = false;
let isGameOver = false;

// --- O CÉREBRO DO GEMINATOR: A INSTRUÇÃO DO SISTEMA ---
const systemPrompt = `### PERSONA E OBJETIVO
Você é 'Geminator', uma IA que joga um jogo de adivinhação. Seu único objetivo é adivinhar o personagem (real ou fictício) em que o usuário está pensando, fazendo perguntas eliminatórias.

### REGRAS DE COMUNICAÇÃO (MANDATÓRIO)
1. **FORMATO DA RESPOSTA:** Sua resposta deve conter **APENAS** a pergunta e o ponto de interrogação. NADA MAIS. Sem saudações, sem comentários, sem texto introdutório.
   * **CORRETO:** \`Seu personagem é um ator?\`
   * **ERRADO:** \`Ok, próxima pergunta: O seu personagem é um ator?\`
2. **UMA PERGUNTA POR VEZ:** Sempre faça apenas uma única pergunta por resposta.
3. **PALPITE FINAL:** Quando tiver 98% de certeza, e apenas nesse momento, sua resposta **DEVE** começar com a frase exata: \`Meu palpite final é: \` seguido do nome do personagem.

### LÓGICA DAS PERGUNTAS (CRÍTICO)
1. **ESTRATÉGIA DE ELIMINAÇÃO:** Comece com perguntas amplas e gerais (ex: "Seu personagem é real?", "É do sexo feminino?", "Aparece em filmes?") para eliminar o maior número de possibilidades. A cada resposta do usuário, refine sua próxima pergunta para ser mais específica.
2. **MEMÓRIA E COERÊNCIA:** Antes de formular uma pergunta, revise as ultimas 5 perguntas e suas respostas da conversa. Nunca faça uma pergunta que contradiga uma informação já fornecida pelo usuário. (Ex: Se o usuário respondeu 'Não' para 'Seu personagem é um homem?', você está proibido de perguntar 'Ele é um ator?').
3. **EVITE PERGUNTAS RUINS:**
   * Não faça perguntas de "isto ou aquilo".
   * Não faça perguntas metafóricas, abstratas ou poéticas (ex: "é o cavaleiro do verão?"). Mantenha as perguntas baseadas em fatos concretos e verificáveis.
   * Não faça perguntas excessivamente específicas ou sobre detalhes obscuros no início do jogo.
4. **PROCESSO OCULTO:** Nunca revele seu processo de pensamento, as opções que está considerando ou a sua confiança. Apenas faça a pergunta ou o palpite final.`;

// --- Funções do Jogo ---
function startGame() {
  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  isGameOver = false;
  isLoading = true;
  chatHistory = [
    {
      role: "user",
      parts: [
        { text: "Pensei em um personagem. Comece a me fazer perguntas." },
      ],
    },
  ];
  finalGuessArea.classList.add("hidden");
  answerButtonsContainer.classList.remove("hidden");
  questionDisplay.textContent = "";
  updateLoadingUI(true);
  callGeminatorAPI();
}

function handleAnswer(userAnswer) {
  if (isLoading || isGameOver) return;
  isLoading = true;
  chatHistory.push({
    role: "user",
    parts: [{ text: `Minha resposta é: ${userAnswer}` }],
  });
  updateLoadingUI(true);
  callGeminatorAPI();
}

async function callGeminatorAPI() {
  if (!API_KEY) {
    questionDisplay.textContent =
      "Erro de configuração: A chave da API não foi definida. Por favor, adicione sua chave de API no arquivo script.js.";
    isGameOver = true;
    isLoading = false;
    updateLoadingUI(false);
    answerButtonsContainer.classList.add("hidden");
    finalGuessArea.classList.remove("hidden");
    return;
  }

  const payload = {
    contents: chatHistory,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.7,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // --- NOSSO DETETIVE (Ainda aqui para garantir) ---
    console.log("[DADOS BRUTOS DA API]", result);

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
      chatHistory.push({ role: "model", parts: [{ text }] });
      processModelResponse(text);
    } else {
      const blockReason =
        result.promptFeedback?.blockReason ||
        result.candidates?.[0]?.finishReason;
      if (blockReason) {
        throw new Error(
          `A resposta foi bloqueada ou finalizada pela API. Motivo: ${blockReason}`
        );
      } else {
        throw new Error("A resposta da API está vazia.");
      }
    }
  } catch (error) {
    console.error("Falha ao comunicar com a API da Gemini:", error);
    questionDisplay.textContent = `Oops! Tive um problema para pensar. Verifique o console para mais detalhes. (${error.message})`;
    isGameOver = true;
  } finally {
    isLoading = false;
    updateLoadingUI(false);
  }
}

function processModelResponse(text) {
  if (text.startsWith("Meu palpite final é:")) {
    isGameOver = true;
    const guess = text.replace("Meu palpite final é:", "").trim();
    questionDisplay.innerHTML = `<p class="text-lg text-gray-400 mb-2">Meu palpite final é...</p><p class="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">${guess}!</p>`;
    answerButtonsContainer.classList.add("hidden");
    finalGuessArea.classList.remove("hidden");
  } else {
    questionDisplay.textContent = text;
  }
}

function updateLoadingUI(show) {
  loadingSpinner.classList.toggle("hidden", !show);
  questionDisplay.classList.toggle("hidden", show);
}

// --- Event Listeners ---
startBtn.addEventListener("click", startGame);
playAgainBtn.addEventListener("click", startGame);
answerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleAnswer(button.dataset.answer);
  });
});
