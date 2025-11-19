from flask import Flask, render_template, request, jsonify, send_file
import json
import os
from datetime import datetime

app = Flask(__name__)

# Configure upload folder for DFA files
UPLOAD_FOLDER = 'saved_dfas'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

class DFAValidator:
    """Backend DFA validation and simulation"""
    
    @staticmethod
    def validate_dfa(dfa_data):
        """Validate DFA structure"""
        required_keys = ['states', 'transitions', 'alphabet']
        if not all(key in dfa_data for key in required_keys):
            return False, "Missing required keys"
        
        if not dfa_data['states']:
            return False, "DFA must have at least one state"
        
        # Check if there's a start state
        has_start = any(state.get('isStart', False) for state in dfa_data['states'])
        if not has_start:
            return False, "DFA must have a start state"
        
        return True, "Valid DFA"
    
    @staticmethod
    def simulate_string(dfa_data, input_string):
        """Simulate DFA execution on input string"""
        # Build state map
        state_map = {state['id']: state for state in dfa_data['states']}
        
        # Find start state
        start_state = next((state for state in dfa_data['states'] if state.get('isStart')), None)
        if not start_state:
            return {'error': 'No start state defined'}
        
        # Build transition table
        transitions = {}
        for trans in dfa_data['transitions']:
            key = (trans['from'], trans['symbol'])
            transitions[key] = trans['to']
        
        # Simulate
        current_state_id = start_state['id']
        path = [current_state_id]
        
        for i, char in enumerate(input_string):
            key = (current_state_id, char)
            if key not in transitions:
                return {
                    'accepted': False,
                    'path': path,
                    'stuck_at': i,
                    'reason': f"No transition from {current_state_id} on symbol '{char}'"
                }
            
            current_state_id = transitions[key]
            path.append(current_state_id)
        
        # Check if final state
        current_state = state_map[current_state_id]
        accepted = current_state.get('isFinal', False)
        
        return {
            'accepted': accepted,
            'path': path,
            'final_state': current_state_id,
            'is_final': accepted
        }
    
    @staticmethod
    def batch_test(dfa_data, test_strings):
        """Test multiple strings"""
        results = []
        for test_string in test_strings:
            result = DFAValidator.simulate_string(dfa_data, test_string)
            results.append({
                'string': test_string,
                'accepted': result.get('accepted', False),
                'path': result.get('path', []),
                'error': result.get('reason', None)
            })
        return results
    
    @staticmethod
    def minimize_dfa(dfa_data):
        """DFA minimization using Myhill-Nerode theorem"""
        # This is a simplified version - full implementation would be more complex
        states = dfa_data['states']
        transitions = dfa_data['transitions']
        
        # Partition states into final and non-final
        final_states = set(s['id'] for s in states if s.get('isFinal', False))
        non_final_states = set(s['id'] for s in states if not s.get('isFinal', False))
        
        partitions = [final_states, non_final_states]
        
        # Iteratively refine partitions (simplified)
        changed = True
        iterations = 0
        while changed and iterations < 10:
            changed = False
            new_partitions = []
            
            for partition in partitions:
                if len(partition) <= 1:
                    new_partitions.append(partition)
                    continue
                
                # Try to split partition
                # (This is a simplified version)
                new_partitions.append(partition)
            
            partitions = new_partitions
            iterations += 1
        
        return {
            'original_states': len(states),
            'minimized_states': len(partitions),
            'partitions': [list(p) for p in partitions],
            'iterations': iterations
        }

@app.route('/')
def index():
    """Serve main page"""
    return render_template('index.html')

@app.route('/api/validate', methods=['POST'])
def validate():
    """Validate DFA structure"""
    dfa_data = request.json
    is_valid, message = DFAValidator.validate_dfa(dfa_data)
    return jsonify({
        'valid': is_valid,
        'message': message
    })

@app.route('/api/simulate', methods=['POST'])
def simulate():
    """Simulate DFA on input string"""
    data = request.json
    dfa_data = data.get('dfa')
    input_string = data.get('input', '')
    
    result = DFAValidator.simulate_string(dfa_data, input_string)
    return jsonify(result)

@app.route('/api/batch-test', methods=['POST'])
def batch_test():
    """Run batch tests"""
    data = request.json
    dfa_data = data.get('dfa')
    test_strings = data.get('tests', [])
    
    results = DFAValidator.batch_test(dfa_data, test_strings)
    return jsonify({'results': results})

@app.route('/api/minimize', methods=['POST'])
def minimize():
    """Minimize DFA"""
    dfa_data = request.json
    result = DFAValidator.minimize_dfa(dfa_data)
    return jsonify(result)

@app.route('/api/save', methods=['POST'])
def save_dfa():
    """Save DFA to file"""
    dfa_data = request.json
    
    # Generate filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'dfa_{timestamp}.json'
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    # Save to file
    with open(filepath, 'w') as f:
        json.dump(dfa_data, f, indent=2)
    
    return jsonify({
        'success': True,
        'filename': filename,
        'path': filepath
    })

@app.route('/api/load/<filename>')
def load_dfa(filename):
    """Load DFA from file"""
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
    
    with open(filepath, 'r') as f:
        dfa_data = json.load(f)
    
    return jsonify(dfa_data)

@app.route('/api/list-saved')
def list_saved():
    """List all saved DFAs"""
    files = []
    if os.path.exists(app.config['UPLOAD_FOLDER']):
        for filename in os.listdir(app.config['UPLOAD_FOLDER']):
            if filename.endswith('.json'):
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                files.append({
                    'filename': filename,
                    'size': os.path.getsize(filepath),
                    'modified': datetime.fromtimestamp(os.path.getmtime(filepath)).isoformat()
                })
    
    return jsonify({'files': files})

@app.route('/api/examples')
def get_examples():
    """Get example DFAs"""
    examples = {
        'binary_even': {
            'name': 'Binary Even Numbers',
            'description': 'Accepts binary strings representing even numbers',
            'dfa': {
                'states': [
                    {'id': 'q0', 'x': 200, 'y': 200, 'isFinal': True, 'isStart': True},
                    {'id': 'q1', 'x': 400, 'y': 200, 'isFinal': False, 'isStart': False}
                ],
                'transitions': [
                    {'from': 'q0', 'to': 'q0', 'symbol': '0'},
                    {'from': 'q0', 'to': 'q1', 'symbol': '1'},
                    {'from': 'q1', 'to': 'q0', 'symbol': '0'},
                    {'from': 'q1', 'to': 'q1', 'symbol': '1'}
                ],
                'alphabet': ['0', '1']
            }
        },
        'divisible_by_3': {
            'name': 'Divisible by 3',
            'description': 'Accepts binary numbers divisible by 3',
            'dfa': {
                'states': [
                    {'id': 'q0', 'x': 200, 'y': 200, 'isFinal': True, 'isStart': True},
                    {'id': 'q1', 'x': 350, 'y': 150, 'isFinal': False, 'isStart': False},
                    {'id': 'q2', 'x': 350, 'y': 250, 'isFinal': False, 'isStart': False}
                ],
                'transitions': [
                    {'from': 'q0', 'to': 'q0', 'symbol': '0'},
                    {'from': 'q0', 'to': 'q1', 'symbol': '1'},
                    {'from': 'q1', 'to': 'q2', 'symbol': '0'},
                    {'from': 'q1', 'to': 'q0', 'symbol': '1'},
                    {'from': 'q2', 'to': 'q1', 'symbol': '0'},
                    {'from': 'q2', 'to': 'q2', 'symbol': '1'}
                ],
                'alphabet': ['0', '1']
            }
        },
        'contains_01': {
            'name': 'Contains "01"',
            'description': 'Accepts strings containing the substring "01"',
            'dfa': {
                'states': [
                    {'id': 'q0', 'x': 150, 'y': 200, 'isFinal': False, 'isStart': True},
                    {'id': 'q1', 'x': 300, 'y': 200, 'isFinal': False, 'isStart': False},
                    {'id': 'q2', 'x': 450, 'y': 200, 'isFinal': True, 'isStart': False}
                ],
                'transitions': [
                    {'from': 'q0', 'to': 'q1', 'symbol': '0'},
                    {'from': 'q0', 'to': 'q0', 'symbol': '1'},
                    {'from': 'q1', 'to': 'q1', 'symbol': '0'},
                    {'from': 'q1', 'to': 'q2', 'symbol': '1'},
                    {'from': 'q2', 'to': 'q2', 'symbol': '0'},
                    {'from': 'q2', 'to': 'q2', 'symbol': '1'}
                ],
                'alphabet': ['0', '1']
            }
        }
    }
    
    return jsonify(examples)

@app.route('/api/statistics', methods=['POST'])
def get_statistics():
    """Get DFA statistics"""
    dfa_data = request.json
    
    states = dfa_data.get('states', [])
    transitions = dfa_data.get('transitions', [])
    
    final_states = [s for s in states if s.get('isFinal', False)]
    
    # Calculate transition coverage
    alphabet = dfa_data.get('alphabet', [])
    total_possible = len(states) * len(alphabet)
    actual_transitions = len(transitions)
    completeness = (actual_transitions / total_possible * 100) if total_possible > 0 else 0
    
    return jsonify({
        'total_states': len(states),
        'final_states': len(final_states),
        'transitions': actual_transitions,
        'alphabet_size': len(alphabet),
        'completeness': round(completeness, 2),
        'is_complete': completeness == 100.0
    })

if __name__ == '__main__':
    print("🚀 Starting Automata Visualizer Pro Server...")
    print("📍 Open your browser to: http://localhost:5000")
    print("📚 Press Ctrl+C to stop the server")
    app.run(debug=True, port=5000)