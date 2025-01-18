import './style.css';
import Anthropic from '@anthropic-ai/sdk';

class SubliminalGenerator {
    constructor() {
    console.log('Initializing SubliminalGenerator...');
    const elevenlabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    if (!elevenlabsKey) {
        throw new Error('ElevenLabs API klíč není nastaven');
    }
    this.ELEVENLABS_API_KEY = elevenlabsKey;
    
    this.initializeComponents();
    this.setupEventListeners();

    this.isCustomMode = false;
    this.editMode = false;
    this.suggestedAffirmations = null;
    this.currentAudio = null; 
}

    initializeComponents() {
        const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;
        if (!apiKey) {
            throw new Error('API klíč není nastaven. Zkontrolujte soubor .env');
        }
        
        this.claude = new Anthropic({
            apiKey: apiKey,
            dangerouslyAllowBrowser: true
        });
        
        this.audioContext = null;
        
        this.generateBtn = document.getElementById('generateBtn');
        this.customBtn = document.getElementById('customBtn');
        this.mixAudioBtn = document.getElementById('mixAudioBtn');
        this.rateRange = document.getElementById('rateRange');
        this.pitchRange = document.getElementById('pitchRange');
        
        this.confirmBtn = document.createElement('button');
        this.confirmBtn.id = 'confirmBtn';
        this.confirmBtn.textContent = 'Potvrdit';
        this.confirmBtn.style.display = 'none';
        
        this.editBtn = document.createElement('button');
        this.editBtn.id = 'editBtn';
        this.editBtn.textContent = 'Editovat';
        this.editBtn.style.display = 'none';

         this.switchToAIBtn = document.createElement('button');
        this.switchToAIBtn.id = 'switchToAIBtn';
        this.switchToAIBtn.textContent = 'Přepnout na AI generování';
        this.switchToAIBtn.style.display = 'none';

        this.applySuggestionsBtn = document.createElement('button');
        this.applySuggestionsBtn.id = 'applySuggestionsBtn';
        this.applySuggestionsBtn.textContent = 'Aplikovat navrhované úpravy';
        this.applySuggestionsBtn.style.display = 'none';

        const inputSection = document.querySelector('.input-section');
        inputSection.appendChild(this.confirmBtn);
        inputSection.appendChild(this.editBtn);
        inputSection.appendChild(this.switchToAIBtn);
        inputSection.appendChild(this.applySuggestionsBtn);

        if (!this.generateBtn || !this.customBtn || !this.mixAudioBtn || 
            !this.rateRange || !this.pitchRange) {
            throw new Error('Některé elementy nebyly nalezeny v DOM');
        }

        this.initAudioContext();
        this.initializeElevenLabsVoices();
        
    }

    setupEventListeners() {
        console.log('Setting up event listeners');
        
        this.generateBtn.addEventListener('click', async (e) => {
            console.log('Generate button clicked');
            e.preventDefault();
            await this.handleGenerate();
        });

        this.customBtn.addEventListener('click', (e) => {
            console.log('Custom Affs button clicked');
            e.preventDefault();
            this.CustomAffsOn();
        })
        
        this.mixAudioBtn.addEventListener('click', async (e) => {
            console.log('Mix button clicked');
            e.preventDefault();
            await this.handleMixAudio();
        });
        this.confirmBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.validateCustomAffirmations();
        });

        this.editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.enterEditMode();
        });

        this.switchToAIBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchToAIMode();
        });

        this.applySuggestionsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.applySuggestions();
        });
    }

    initAudioContext() {
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('AudioContext initialized');
            }
        }, { once: true });
    }

    async handleGenerate() {
        console.log('Starting generation process');
        const goalInput = document.getElementById('goalInput');
        const affirmationsDiv = document.getElementById('affirmations');

        if (!goalInput.value.trim()) {
            alert('Prosím zadejte nejdříve váš cíl');
            return;
        }

        try {
            this.generateBtn.disabled = true;
            this.generateBtn.textContent = 'Generuji...';

            console.log('Sending request to Claude API with goal:', goalInput.value);
            const response = await this.claude.messages.create({
                model: "claude-3-opus-20240229",
                max_tokens: 1000,
                temperature: 0.7,
                system: "Jsi expert na vytváření pozitivních afirmací. Odpovídej pouze samotnými afirmacemi, každou na novém řádku.",
                messages: [{
                    role: "user",
                    content: `Vytvoř 10 pozitivních afirmací pro tento cíl: ${goalInput.value}.`
                }]
            });

            console.log('Response received from Claude API:', response);

            if (!response.content || !response.content[0] || !response.content[0].text) {
                throw new Error('Neplatná odpověď od API');
            }

            const affirmations = response.content[0].text.trim().split('\n');
            affirmationsDiv.innerHTML = affirmations
                .map(aff => `<p>${aff}</p>`)
                .join('');

            this.mixAudioBtn.disabled = false;
            console.log('Affirmations generated successfully');

        } catch (error) {
            console.error('Error during generation:', error);
            affirmationsDiv.innerHTML = `
                <p class="error">
                    Nastala chyba při generování afirmací: ${error.message}
                </p>`;
        } finally {
            this.generateBtn.disabled = false;
            this.generateBtn.textContent = 'Generovat afirmace';
        }
    }
    
    CustomAffsOn() {
        this.isCustomMode = true;
        const goalInput = document.getElementById('goalInput');
        const generateBtn = document.getElementById('generateBtn');
        
        goalInput.value = '';
        goalInput.style.display = 'block'; 
        goalInput.placeholder = 'Zadejte své afirmace (každou na nový řádek)';
        
        generateBtn.style.display = 'none';
        this.confirmBtn.style.display = 'inline-block';
        this.customBtn.style.display = 'none';
        this.switchToAIBtn.style.display = 'inline-block';
        this.applySuggestionsBtn.style.display = 'none';
        this.editBtn.style.display = 'none';

        // Reset audio
        this.mixAudioBtn.disabled = true;
        const audioPlayerContainer = document.getElementById('audioPlayerContainer');
        if (audioPlayerContainer) {
            audioPlayerContainer.innerHTML = '';
        }

        // Vyčištění předchozích afirmací
        const affirmationsDiv = document.getElementById('affirmations');
        affirmationsDiv.innerHTML = '';
        this.suggestedAffirmations = null;
    }
    
    switchToAIMode() {
        this.isCustomMode = false;
        const goalInput = document.getElementById('goalInput');
        const generateBtn = document.getElementById('generateBtn');
        
        // Reset UI
        goalInput.value = '';
        goalInput.style.display = 'block';
        goalInput.placeholder = 'Zadejte svůj cíl... (např. \'Chci být sebevědomější v práci\')';
        
        generateBtn.style.display = 'inline-block';
        this.confirmBtn.style.display = 'none';
        this.customBtn.style.display = 'inline-block';
        this.switchToAIBtn.style.display = 'none';
        this.applySuggestionsBtn.style.display = 'none';
        this.editBtn.style.display = 'none';

        this.mixAudioBtn.disabled = true;
        const audioPlayerContainer = document.getElementById('audioPlayerContainer');
        if (audioPlayerContainer) {
        audioPlayerContainer.innerHTML = '';
        }
        
        // Vyčištění
        const affirmationsDiv = document.getElementById('affirmations');
        affirmationsDiv.innerHTML = '';
        this.suggestedAffirmations = null;
        
    }

    async validateCustomAffirmations() {
        const goalInput = document.getElementById('goalInput');
        const affirmationsDiv = document.getElementById('affirmations');
        const affirmations = goalInput.value.trim().split('\n').filter(aff => aff.trim());

        if (!affirmations.length) {
            alert('Prosím zadejte nějaké afirmace');
            return;
        }

        try {
            this.confirmBtn.disabled = true;
            this.confirmBtn.textContent = 'Kontroluji...';

            const response = await this.claude.messages.create({
                model: "claude-3-opus-20240229",
                max_tokens: 1000,
                temperature: 0.7,
                system: "Jsi expert na kontrolu pozitivních afirmací. Tvým úkolem je zkontrolovat afirmace a vrátit JSON objekt s výsledkem kontroly.",
                messages: [{
                    role: "user",
                    content: `Zkontroluj tyto afirmace a vrať JSON objekt s následující strukturou:
                    {
                        "status": "ok" | "suggestions" | "rejected",
                        "message": "zpráva pro uživatele",
                        "suggestions": [
                            {
                                "original": "původní afirmace",
                                "suggested": "navrhovaná úprava",
                                "reason": "důvod úpravy"
                            }
                        ] // pouze při status="suggestions"
                    }
                    
                    Afirmace k kontrole:
                    ${affirmations.join('\n')}`
                }]
            });

            const result = JSON.parse(response.content[0].text);
            
            switch(result.status) {
                 case 'ok':
                    this.displayValidatedAffirmations(affirmations);
                    this.displayMessage(result.message, 'success-message');
                    this.mixAudioBtn.disabled = false;
                    break;
                    
                case 'suggestions':
                    this.suggestedAffirmations = result.suggestions;
                    this.displayAffirmationsWithSuggestions(affirmations, result.suggestions);
                    this.displayMessage(result.message, 'suggestion-message');
                    this.applySuggestionsBtn.style.display = 'inline-block';
                    this.mixAudioBtn.disabled = false;
                    break;
                    
                case 'rejected':
                    this.displayMessage(result.message, 'error-message');
                    this.mixAudioBtn.disabled = true;
                    return;
            }

            if (result.status !== 'rejected') {
                this.editBtn.style.display = 'inline-block';
                goalInput.style.display = 'none';
                this.confirmBtn.style.display = 'none';
            }

         } catch (error) {
            console.error('Error during validation:', error);
            this.displayMessage(`Nastala chyba při kontrole afirmací: ${error.message}`, 'error');
        } finally {
            this.confirmBtn.disabled = false;
            this.confirmBtn.textContent = 'Potvrdit';
        }
    }

     displayMessage(message, className) {
        const messageDiv = document.createElement('div');
        messageDiv.className = className;
        messageDiv.textContent = message;
        document.getElementById('affirmations').appendChild(messageDiv);
    }

    displayAffirmationsWithSuggestions(originals, suggestions) {
        const affirmationsDiv = document.getElementById('affirmations');
        affirmationsDiv.innerHTML = '';

        // Kontejner pro samotné afirmace
        const affirmationsContainer = document.createElement('div');
        affirmationsContainer.className = 'affirmations-container';
        // Přidáme data atribut pro snadnou identifikaci
        affirmationsContainer.setAttribute('data-content-type', 'affirmations');

        // Kontejner pro návrhy a zprávy
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'suggestions-container';
        suggestionsContainer.setAttribute('data-content-type', 'suggestions');

        originals.forEach((aff, index) => {
            const suggestion = suggestions.find(s => s.original === aff);
            
            // Samotná afirmace
            const affDiv = document.createElement('div');
            affDiv.className = 'affirmation-item';
            
            const originalP = document.createElement('p');
            originalP.textContent = aff;
            originalP.className = 'affirmation';
            affDiv.appendChild(originalP);
            affirmationsContainer.appendChild(affDiv);
            
            // Pokud existuje návrh, přidáme ho do container pro návrhy
            if (suggestion) {
                const suggestionDiv = document.createElement('div');
                suggestionDiv.className = 'suggestion-item';
                
                const suggestedP = document.createElement('p');
                suggestedP.textContent = `Návrh: ${suggestion.suggested}`;
                suggestedP.className = 'suggested-affirmation';
                
                const reasonP = document.createElement('p');
                reasonP.textContent = suggestion.reason;
                reasonP.className = 'suggestion-reason';
                
                suggestionDiv.appendChild(suggestedP);
                suggestionDiv.appendChild(reasonP);
                suggestionsContainer.appendChild(suggestionDiv);
            }
        });

        // Nejdřív přidá afirmace
        affirmationsDiv.appendChild(affirmationsContainer);
        // Pak přidá návrhy
        affirmationsDiv.appendChild(suggestionsContainer);
    }

    getAffirmationsForAudio() {
    // Nejprve zkontrolujeme, jestli existují afirmace v DOM
    const affirmationsDiv = document.getElementById('affirmations');
    if (!affirmationsDiv) return [];

    // Pokusíme se najít afirmace v různých možných strukturách
    let affirmations = [];

    // 1. Pokus - hledání v container struktuře (pro validované/upravené afirmace)
    const affirmationsContainer = affirmationsDiv.querySelector('.affirmations-container');
    if (affirmationsContainer) {
        affirmations = Array.from(affirmationsContainer.querySelectorAll('.affirmation'))
            .map(el => el.textContent)
            .filter(text => text && text.trim());
    }

    // 2. Pokus - přímé paragraph elementy (pro AI generované afirmace)
    if (affirmations.length === 0) {
        affirmations = Array.from(affirmationsDiv.querySelectorAll('p'))
            .map(el => el.textContent)
            .filter(text => text && text.trim() && !text.startsWith('Návrh:') && !text.includes('Nastala chyba'));
    }

    console.log('Found affirmations:', affirmations); // Pro debugování
    return affirmations;
}

    applySuggestions() {
        if (!this.suggestedAffirmations) return;
        
        const affirmations = document.querySelectorAll('.original-affirmation');
        const updatedAffirmations = Array.from(affirmations).map(aff => {
            const original = aff.textContent;
            const suggestion = this.suggestedAffirmations.find(s => s.original === original);
            return suggestion ? suggestion.suggested : original;
        });
        
        this.displayValidatedAffirmations(updatedAffirmations);
        this.applySuggestionsBtn.style.display = 'none';
    }

     displayValidatedAffirmations(affirmations) {
        const affirmationsDiv = document.getElementById('affirmations');
        const affirmationsContainer = document.createElement('div');
        affirmationsContainer.className = 'affirmations-container';
        
        affirmations.forEach(aff => {
            const p = document.createElement('p');
            p.className = 'affirmation';
            p.textContent = aff;
            affirmationsContainer.appendChild(p);
        });
        
        affirmationsDiv.innerHTML = '';
        affirmationsDiv.appendChild(affirmationsContainer);
    }

    enterEditMode() {
       const goalInput = document.getElementById('goalInput');
        const affirmationsDiv = document.getElementById('affirmations');
        
        // Získat současné afirmace
        const currentAffirmations = Array.from(
            affirmationsDiv.getElementsByClassName('affirmation')
        ).map(p => p.textContent);
        
        // Přepnout zpět do režimu editace
        goalInput.style.display = 'block';
        goalInput.value = currentAffirmations.join('\n');
        this.confirmBtn.style.display = 'inline-block';
        this.editBtn.style.display = 'none';
        this.applySuggestionsBtn.style.display = 'none';
        affirmationsDiv.innerHTML = '';
        this.mixAudioBtn.disabled = true;
    }


    async initializeElevenLabsVoices() {
        console.log('ElevenLabs API Key:', this.ELEVENLABS_API_KEY ? 'Exists' : 'Missing');
        try {
            const response = await fetch('https://api.elevenlabs.io/v1/voices', {
                headers: {
                    'xi-api-key': this.ELEVENLABS_API_KEY
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch voices');
            
            const data = await response.json();
            this.populateVoiceList(data.voices);
        } catch (error) {
            console.error('Error fetching ElevenLabs voices:', error);
            alert('Nepodařilo se načíst hlasy z ElevenLabs');
        }
    }

    populateVoiceList(voices) {
    const voiceSelect = document.getElementById('voiceSelect');
    voiceSelect.innerHTML = '';

    console.log('Available voices:', voices); // Pro debug - uvidíme všechny dostupné hlasy

    // Zobrazí všechny multilingual hlasy a přidá informaci o jejich vlastnostech
    voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.voice_id;
        
        // Zobrazí všechny relevantní informace o hlasu
        const labels = voice.labels || {};
        const languageInfo = labels.language || 'multilingual';
        const description = voice.description || '';
        
        option.textContent = `${voice.name} (${languageInfo}) ${description}`;
        voiceSelect.appendChild(option);

        console.log(`Added voice: ${voice.name}`, voice); // Pro debug jednotlivých hlasů
    });

    if (voiceSelect.options.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Žádné hlasy nejsou k dispozici';
        voiceSelect.appendChild(option);
    }

}

    async handleMixAudio() {
        console.log('Starting audio generation with ElevenLabs');
        const affirmations = this.getAffirmationsForAudio();
        
        if (!affirmations.length) {
            alert('Nejdřív vygenerujte afirmace.');
            return;
        }

        const voiceId = document.getElementById('voiceSelect').value;
        if (!voiceId) {
            alert('Vyberte prosím hlas.');
            return;
        }

        try {
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
                {
                    method: 'POST',
                    headers: {
                        'xi-api-key': this.ELEVENLABS_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: affirmations.join('. '),
                        model_id: "eleven_multilingual_v2",
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.75,
                            style: 0.5,
                            use_speaker_boost: true
                        }
                    })
                }
            );

            if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs API Error:', errorText);
            throw new Error('Failed to generate speech');
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        this.setupAudioPlayer(audioUrl, audioBlob);

        } catch (error) {
            console.error('Error during audio generation:', error);
            alert('Nastala chyba při generování audia.');
        } finally {
            this.hideLoadingState();
        }
    }

    showLoadingState() {
        const loadingDiv = document.getElementById('loadingState');
        loadingDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Vyčkejte prosím, Vaše audio se připravuje...</p>
        `;
        loadingDiv.style.display = 'flex';
        this.mixAudioBtn.disabled = true;
    }

    hideLoadingState() {
        document.getElementById('loadingState').style.display = 'none';
        this.mixAudioBtn.disabled = false;
    }
     setupAudioPlayer(audioUrl, audioBlob) {
        // Odstranění předchozího přehrávače, pokud existuje
        const oldPlayer = document.getElementById('audioPlayer');
        if (oldPlayer) {
            oldPlayer.remove();
        }

        const playerContainer = document.getElementById('audioPlayerContainer');
        playerContainer.innerHTML = `
            <div class="audio-player">
                <audio id="audioPlayer" controls>
                    <source src="${audioUrl}" type="audio/mpeg">
                    Váš prohlížeč nepodporuje přehrávání audia.
                </audio>
                <button id="downloadBtn" class="download-btn">Stáhnout audio</button>
            </div>
        `;

        // Nastavení přehrávače
        this.currentAudio = document.getElementById('audioPlayer');
        
        // Přidání tlačítka pro stažení
        document.getElementById('downloadBtn').addEventListener('click', () => {
            const downloadLink = document.createElement('a');
            downloadLink.href = audioUrl;
            downloadLink.download = 'afirmace.mp3'; // Název souboru pro stažení
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('DOM loaded, initializing app...');
        const app = new SubliminalGenerator();
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        document.body.innerHTML += `
            <div class="error">
                Chyba při inicializaci aplikace: ${error.message}
            </div>`;
    }
});