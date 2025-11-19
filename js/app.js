// Main Application Controller
class App {
    constructor() {
        this.dfa = new DFA();
        this.canvas = document.getElementById('canvas');
        this.renderer = new Renderer(this.canvas, this.dfa);
        this.mode = 'addState';
        
        // Simulation state
        this.simString = "";
        this.simIndex = 0;
        this.simInterval = null;

        this.setupInput();
        this.setupMouse();
    }

    /**
     * Setup keyboard input handlers
     */
    setupInput() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.dfa.selectedState) {
                this.deleteSelected();
            }
        });
    }

    /**
     * Setup mouse event handlers for canvas interaction
     */
    setupMouse() {
        let isDragging = false;
        let draggedState = null;

        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            return { 
                x: e.clientX - rect.left, 
                y: e.clientY - rect.top 
            };
        };

        // Mouse down event
        this.canvas.addEventListener('mousedown', (e) => {
            const pos = getPos(e);
            const state = this.renderer.getStateAt(pos.x, pos.y);

            // Add new state if clicking empty space in addState mode
            if (this.mode === 'addState' && !state) {
                this.dfa.addState(pos.x, pos.y);
                this.renderer.draw();
                return;
            }

            // Handle clicking on existing state
            if (state) {
                if (this.mode === 'addState') {
                    // Enable dragging
                    isDragging = true;
                    draggedState = state;
                    this.dfa.selectedState = state;
                    this.renderer.draw();
                } 
                else if (this.mode === 'addTransition') {
                    // Start creating transition
                    this.dfa.tempTransition = { from: state, to: pos };
                } 
                else if (this.mode === 'setStart') {
                    // Set as start state
                    this.dfa.startState = state;
                    this.showToast('Start state updated');
                    this.renderer.draw();
                } 
                else if (this.mode === 'toggleFinal') {
                    // Toggle final state
                    state.isFinal = !state.isFinal;
                    this.renderer.draw();
                }
            }
        });

        // Mouse move event
        this.canvas.addEventListener('mousemove', (e) => {
            const pos = getPos(e);
            
            // Drag state
            if (isDragging && draggedState) {
                draggedState.x = pos.x;
                draggedState.y = pos.y;
                this.renderer.draw();
            } 
            // Update temporary transition line
            else if (this.dfa.tempTransition) {
                this.dfa.tempTransition.to = pos;
                this.renderer.draw();
            }
        });

        // Mouse up event
        this.canvas.addEventListener('mouseup', (e) => {
            const pos = getPos(e);
            const state = this.renderer.getStateAt(pos.x, pos.y);

            // Complete transition if ending on a state
            if (this.dfa.tempTransition && state) {
                const symbol = prompt(`Transition on input (${this.dfa.alphabet.join(',')}):`);
                
                if (symbol && this.dfa.alphabet.includes(symbol)) {
                    this.dfa.addTransition(
                        this.dfa.tempTransition.from, 
                        state, 
                        symbol
                    );
                    this.showToast(`Added transition: ${this.dfa.tempTransition.from.id} → ${state.id} on '${symbol}'`);
                } else if (symbol) {
                    this.showToast('Invalid symbol! Must be in alphabet.', true);
                }
            }

            // Reset temporary states
            this.dfa.tempTransition = null;
            isDragging = false;
            draggedState = null;
            this.renderer.draw();
        });
    }

    /**
     * Change interaction mode
     */
    setMode(mode, btnElement) {
        this.mode = mode;
        
        // Update UI active class
        document.querySelectorAll('.tool-btn').forEach(b => {
            b.classList.remove('active');
        });
        if (btnElement) {
            btnElement.classList.add('active');
        }
    }

    /**
     * Delete currently selected state
     */
    deleteSelected() {
        if (this.dfa.selectedState) {
            this.dfa.deleteState(this.dfa.selectedState);
            this.showToast('State deleted');
            this.renderer.draw();
        }
    }

    /**
     * Clear entire canvas
     */
    clearAll() {
        if (confirm('Clear entire canvas? This cannot be undone.')) {
            this.dfa.reset();
            this.stopSimulation();
            this.renderer.draw();
            this.showToast('Canvas cleared');
        }
    }

    /**
     * Update alphabet from input
     */
    updateAlphabet() {
        const val = document.getElementById('alphabetInput').value;
        this.dfa.alphabet = val.split(',')
            .map(s => s.trim())
            .filter(s => s);
        
        this.showToast('Alphabet updated: ' + this.dfa.alphabet.join(', '));
    }

    // ==================== SIMULATION ====================

    /**
     * Start simulation with input string
     */
    startSimulation() {
        const input = document.getElementById('simulateInput').value;
        
        if (!this.dfa.startState) {
            return this.showToast('Set a start state first!', true);
        }
        
        this.simString = input;
        this.simIndex = 0;
        this.dfa.currentState = this.dfa.startState;
        
        // Show simulation controls
        document.getElementById('simControls').classList.remove('hidden');
        this.updateSimUI();
        this.renderer.draw();
    }

    /**
     * Stop simulation
     */
    stopSimulation() {
        clearInterval(this.simInterval);
        this.dfa.currentState = null;
        document.getElementById('simControls').classList.add('hidden');
        this.renderer.draw();
    }

    /**
     * Step through simulation (forward or backward)
     */
    stepSimulation(dir = 1) {
        if (dir === 1) {
            // Step forward
            if (this.simIndex >= this.simString.length) {
                this.finishSimulation();
                return;
            }
            
            const char = this.simString[this.simIndex];
            const trans = this.dfa.getTransition(this.dfa.currentState, char);
            
            if (trans) {
                this.dfa.currentState = trans.to;
                this.simIndex++;
                this.updateSimUI();
                this.renderer.draw();
            } else {
                this.showToast(`Crashed! No transition for '${char}' from ${this.dfa.currentState.id}`, true);
                this.stopSimulation();
            }
        }
    }

    /**
     * Auto-run simulation with interval
     */
    autoSimulation() {
        if (this.simInterval) clearInterval(this.simInterval);
        this.simInterval = setInterval(() => {
            this.stepSimulation(1);
        }, 800);
    }

    /**
     * Finish simulation and show result
     */
    finishSimulation() {
        clearInterval(this.simInterval);
        const accepted = this.dfa.currentState.isFinal;
        const status = document.getElementById('simStatus');
        
        status.innerHTML = accepted 
            ? '<span style="color:var(--success)">✓ ACCEPTED</span>' 
            : '<span style="color:#ef4444">✗ REJECTED</span>';
        
        this.showToast(
            accepted ? 'String accepted!' : 'String rejected!',
            !accepted
        );
    }

    /**
     * Update simulation UI display
     */
    updateSimUI() {
        const display = document.getElementById('simDisplay');
        let html = '';
        
        for (let i = 0; i < this.simString.length; i++) {
            if (i === this.simIndex) {
                html += `<span class="char active">${this.simString[i]}</span>`;
            } else {
                html += `<span class="char">${this.simString[i]}</span>`;
            }
        }
        
        if (this.simIndex === this.simString.length) {
            html += ' <span style="font-size:12px">END</span>';
        }
        
        display.innerHTML = html;
        document.getElementById('simStatus').innerText = "Running...";
    }

    // ==================== BATCH TESTING ====================

    /**
     * Run batch tests on multiple strings
     */
    runBatchTests() {
        const lines = document.getElementById('testInput').value.split('\n');
        const resultsDiv = document.getElementById('testResults');
        resultsDiv.innerHTML = '';

        if (!this.dfa.startState) {
            return this.showToast('No start state defined!', true);
        }

        lines.forEach(str => {
            if (!str.trim()) return;
            
            // Simulate the string
            let curr = this.dfa.startState;
            let valid = true;
            
            for (let char of str.trim()) {
                const t = this.dfa.getTransition(curr, char);
                if (t) {
                    curr = t.to;
                } else {
                    valid = false;
                    break;
                }
            }
            
            const accepted = valid && curr.isFinal;
            const color = accepted ? 'var(--success)' : '#ef4444';
            const text = accepted ? 'PASS' : 'FAIL';
            
            resultsDiv.innerHTML += `
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-family:monospace; background:#f1f5f9; padding:6px 10px; border-radius:4px; border-left: 3px solid ${color};">
                    <span>${str}</span>
                    <span style="color:${color}; font-weight:bold">${text}</span>
                </div>
            `;
        });
    }

    // ==================== IMPORT/EXPORT ====================

    /**
     * Export DFA to JSON file
     */
    exportDFA() {
        const data = JSON.stringify(this.dfa.toJSON(), null, 2);
        
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dfa.json';
        a.click();
        
        this.showToast('DFA exported successfully');
    }

    /**
     * Import DFA from JSON file
     */
    importDFA(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.dfa.fromJSON(data);
                
                // Update UI
                document.getElementById('alphabetInput').value = this.dfa.alphabet.join(',');
                this.renderer.draw();
                
                this.showToast('DFA imported successfully');
            } catch (err) {
                this.showToast('Error loading file: Invalid JSON', true);
                console.error(err);
            }
        };
        reader.readAsText(file);
    }

    // ==================== UTILITIES ====================

    /**
     * Show toast notification
     */
    showToast(msg, isError = false) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.style.backgroundColor = isError ? '#ef4444' : '#1e293b';
        t.classList.add('show');
        
        setTimeout(() => {
            t.classList.remove('show');
        }, 3000);
    }
}

// Initialize app when DOM is loaded
const app = new App();