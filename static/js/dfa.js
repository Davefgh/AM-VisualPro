// DFA Class - Logic for Deterministic Finite Automaton
class DFA {
    constructor() {
        this.states = [];
        this.transitions = [];
        this.alphabet = ['0', '1'];
        this.startState = null;
        this.currentState = null;
        this.selectedState = null;
        this.tempTransition = null;
    }

    /**
     * Add a new state at coordinates (x, y)
     */
    addState(x, y) {
        const id = 'q' + this.states.length;
        const state = { id, x, y, isFinal: false };
        this.states.push(state);
        
        // First state becomes start state automatically
        if (!this.startState) {
            this.startState = state;
        }
        
        return state;
    }

    /**
     * Add a transition from one state to another on a symbol
     */
    addTransition(from, to, symbol) {
        // Check if transition already exists (DFA can only have one transition per symbol)
        const existing = this.transitions.find(t => 
            t.from === from && t.symbol === symbol
        );
        
        if (existing) {
            // Update existing transition
            existing.to = to;
        } else {
            // Add new transition
            this.transitions.push({ from, to, symbol });
        }
    }

    /**
     * Delete a state and all its associated transitions
     */
    deleteState(state) {
        this.states = this.states.filter(s => s !== state);
        this.transitions = this.transitions.filter(t => 
            t.from !== state && t.to !== state
        );
        
        // Update start state if deleted
        if (this.startState === state) {
            this.startState = this.states[0] || null;
        }
        
        // Clear selection if deleted
        if (this.selectedState === state) {
            this.selectedState = null;
        }
    }

    /**
     * Get transition from a state on a given symbol
     */
    getTransition(from, symbol) {
        return this.transitions.find(t => 
            t.from === from && t.symbol === symbol
        );
    }

    /**
     * Simulate the DFA on an input string
     */
    simulate(inputString) {
        if (!this.startState) {
            return { 
                accepted: false, 
                path: [], 
                error: 'No start state defined' 
            };
        }
        
        let current = this.startState;
        const path = [current];
        
        for (let i = 0; i < inputString.length; i++) {
            const char = inputString[i];
            const transition = this.getTransition(current, char);
            
            if (!transition) {
                return { 
                    accepted: false, 
                    path, 
                    error: `No transition from ${current.id} on symbol '${char}'`,
                    stuckAt: i
                };
            }
            
            current = transition.to;
            path.push(current);
        }
        
        return { 
            accepted: current.isFinal, 
            path,
            finalState: current
        };
    }

    /**
     * Check if DFA is complete (has transitions for all symbols from all states)
     */
    isComplete() {
        for (let state of this.states) {
            for (let symbol of this.alphabet) {
                if (!this.getTransition(state, symbol)) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Get statistics about the DFA
     */
    getStatistics() {
        const finalStates = this.states.filter(s => s.isFinal).length;
        const totalPossible = this.states.length * this.alphabet.length;
        const completeness = totalPossible > 0 
            ? (this.transitions.length / totalPossible * 100).toFixed(1)
            : 0;
        
        return {
            totalStates: this.states.length,
            finalStates: finalStates,
            transitions: this.transitions.length,
            alphabetSize: this.alphabet.length,
            completeness: completeness,
            isComplete: this.isComplete()
        };
    }

    /**
     * Reset the DFA to empty state
     */
    reset() {
        this.states = [];
        this.transitions = [];
        this.startState = null;
        this.selectedState = null;
        this.currentState = null;
        this.tempTransition = null;
    }

    /**
     * Export DFA to JSON format
     */
    toJSON() {
        return {
            states: this.states.map(s => ({
                id: s.id,
                x: s.x,
                y: s.y,
                isFinal: s.isFinal,
                isStart: s === this.startState
            })),
            transitions: this.transitions.map(t => ({
                from: t.from.id,
                to: t.to.id,
                symbol: t.symbol
            })),
            alphabet: this.alphabet
        };
    }

    /**
     * Import DFA from JSON data
     */
    fromJSON(data) {
        this.reset();
        this.alphabet = data.alphabet || ['0', '1'];
        
        const stateMap = {};
        
        // Create states
        data.states.forEach(s => {
            const state = { 
                id: s.id, 
                x: s.x, 
                y: s.y, 
                isFinal: s.isFinal 
            };
            this.states.push(state);
            stateMap[s.id] = state;
            
            if (s.isStart) {
                this.startState = state;
            }
        });
        
        // Create transitions
        data.transitions.forEach(t => {
            this.transitions.push({
                from: stateMap[t.from],
                to: stateMap[t.to],
                symbol: t.symbol
            });
        });
    }
}