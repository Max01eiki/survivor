# 🐍 Neon Snake | Antigravity Project

Um jogo clássico de Snake reimaginado com uma estética moderna **Neon**, desenvolvido sob as diretrizes do Antigravity.

## 🚀 Como Executar

Simplesmente abra o arquivo `index.html` em qualquer navegador moderno. Como o projeto utiliza JavaScript Vanilla e não possui dependências externas, ele funciona imediatamente.

## 🛠️ Tecnologias Utilizadas

-   **HTML5 Canvas API**: Para renderização de alta performance.
-   **CSS3**: Estilização moderna com efeitos de Glassmorphism e Neon.
-   **JavaScript (ES6+)**: Lógica do jogo, sistema de partículas e dificuldade progressiva.
-   **localStorage**: Persistência do recorde local.

## 🕹️ Controles

-   **Setas do Teclado** ou **WASD**: Movimentar a cobra.
-   **Espaço**: Reiniciar o jogo após o Game Over.
-   **Botão Iniciar**: Começar a partida.

## 📂 Estrutura do Projeto

```plaintext
/survivor
├── index.html          # Estrutura e Interface
├── style.css           # Estilização e Neon Effects
├── script.js           # Lógica do Jogo e Canvas
└── README.md           # Documentação
```

## 🌐 Deploy no GitHub Pages

Para disponibilizar o jogo online:

1.  No **GitHub Desktop**, faça o commit dos arquivos criados.
2.  Clique em **Push Origin** para enviar ao seu repositório.
3.  No site do GitHub, vá em **Settings > Pages**.
4.  Em "Build and deployment", selecione a branch `main` (ou `master`) e a pasta `/ (root)`.
5.  Salve e aguarde alguns minutos. O link será: `https://seu-usuario.github.io/survivor/`.

## ✨ Destaques do Desenvolvimento

-   **Glow Effect**: Implementado via `shadowBlur` e `shadowColor` no Canvas para um visual premium.
-   **Partículas**: Efeito de dispersão ao coletar frutas.
-   **Dificuldade Dinâmica**: A velocidade aumenta gradualmente conforme você pontua.
-   **Input Buffer**: Sistema que evita comandos perdidos durante o ciclo de frames.

---
Desenvolvido por **Antigravity** 🤖
