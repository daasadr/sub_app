import { AnthropicClient } from '@anthropic-ai/sdk';

class SubliminalGenerator {
    constructor(claudeApiKey) {
        this.claude = new AnthropicClient(claudeApiKey);
        this.audioContext = null;
        this.initAudioContext();
        this.setupEventListeners();
    }

    initAudioContext() {
        // Inicializace Web Audio API až při interakci uživatele
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }, { once: true });
    }

    setupEventListeners() {
        document.getElementById('generateBtn').addEventListener('click', () => this.handleGenerate());
        document.getElementById('mixAudioBtn').addEventListener('click', () => this.handleMixAudio());
    }

    async handleGenerate() {
        const goal = document.getElementById('goalInput').value;
        try {
            const affirmations = await this.generateAffirmations(goal);
            this.displayAffirmations(affirmations);
        } catch (error) {
            console.error('Chyba při generování:', error);
            alert('Nastala chyba při generování afirmací.');
        }
    }

    async generateAffirmations(goal) {
        const response = await this.claude.messages.create({
            model: "claude-3-opus-20240229",
            max_tokens: 1000,
            messages: [{
                role: "user",
                content: `Vytvoř 5 pozitivních afirmací pro cíl: ${goal}`
            }]
        });

        return response.content[0].text.split('\n');
    }

    displayAffirmations(affirmations) {
        const container = document.getElementById('affirmations');
        container.innerHTML = affirmations
            .map(aff => `<p>${aff}</p>`)
            .join('');
        
        document.getElementById('mixAudioBtn').disabled = false;
    }

    // Další metody pro práci se zvukem budou následovat...
}

// Inicializace aplikace
const app = new SubliminalGenerator('your-claude-api-key');