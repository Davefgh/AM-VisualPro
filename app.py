from flask import Flask, render_template, request, jsonify, send_file
import json
import os
from datetime import datetime
import xml.etree.ElementTree as ET

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
    def parse_jflap(xml_content):
        """Parse JFLAP .jff XML content to DFA JSON format"""
        try:
            root = ET.fromstring(xml_content)
            
            # Basic validation
            type_elem = root.find('type')
            if type_elem is None or type_elem.text != 'fa':
                return None, "Not a Finite Automaton file"
            
            automaton = root.find('automaton')
            if automaton is None:
                return None, "No automaton definition found"
            
            states = []
            transitions = []
            alphabet = set()
            
            # Parse states
            for state_elem in automaton.findall('state'):
                state_id = state_elem.get('id')
                name = state_elem.get('name')
                x = float(state_elem.find('x').text) if state_elem.find('x') is not None else 100.0
                y = float(state_elem.find('y').text) if state_elem.find('y') is not None else 100.0
                is_initial = state_elem.find('initial') is not None
                is_final = state_elem.find('final') is not None
                
                states.append({
                    'id': f"q{state_id}", # Normalize IDs
                    'name': name,
                    'x': x,
                    'y': y,
                    'isStart': is_initial,
                    'isFinal': is_final
                })
            
            # Parse transitions
            for trans_elem in automaton.findall('transition'):
                from_id = f"q{trans_elem.find('from').text}"
                to_id = f"q{trans_elem.find('to').text}"
                read_elem = trans_elem.find('read')
                symbol = read_elem.text if read_elem is not None and read_elem.text else ""
                
                if symbol:
                    alphabet.add(symbol)
                    transitions.append({
                        'from': f"q{from_id}",
                        'to': f"q{to_id}",
                        'symbol': symbol
                    })
            
            return {
                'states': states,
                'transitions': transitions,
                'alphabet': sorted(list(alphabet))
            }, "Success"
            
        except Exception as e:
            return None, f"Error parsing JFLAP file: {str(e)}"
    
    @staticmethod
    def minimize_dfa(dfa_data):
        """
        DFA minimization using Hopcroft's algorithm (Partition Refinement).
        Returns detailed steps for visualization.
        """
        states = dfa_data['states']
        transitions = dfa_data['transitions']
        alphabet = dfa_data['alphabet']
        
        # 1. Remove unreachable states (BFS)
        start_state = next((s for s in states if s.get('isStart')), None)
        if not start_state:
            return {'error': 'No start state'}
            
        reachable = {start_state['id']}
        queue = [start_state['id']]
        
        # Build adjacency list for faster traversal
        adj = {s['id']: {} for s in states}
        for t in transitions:
            if t['from'] not in adj: adj[t['from']] = {}
            adj[t['from']][t['symbol']] = t['to']
            
        while queue:
            curr = queue.pop(0)
            for symbol in alphabet:
                if curr in adj and symbol in adj[curr]:
                    next_state = adj[curr][symbol]
                    if next_state not in reachable:
                        reachable.add(next_state)
                        queue.append(next_state)
        
        # Filter states
        active_states = [s for s in states if s['id'] in reachable]
        
        # 2. Initialize Partitions (Final vs Non-Final)
        final_states = set(s['id'] for s in active_states if s.get('isFinal', False))
        non_final_states = set(s['id'] for s in active_states if not s.get('isFinal', False))
        
        partitions = []
        if final_states: partitions.append(final_states)
        if non_final_states: partitions.append(non_final_states)
        
        steps = []
        steps.append({
            'description': 'Initial Partition (Final vs Non-Final)',
            'partitions': [list(p) for p in partitions]
        })
        
        # 3. Refine Partitions
        changed = True
        iteration = 0
        
        while changed:
            changed = False
            new_partitions = []
            
            for group in partitions:
                if len(group) <= 1:
                    new_partitions.append(group)
                    continue
                
                # Try to split this group
                groups_by_signature = {}
                
                for state_id in group:
                    signature = []
                    for symbol in alphabet:
                        target = adj.get(state_id, {}).get(symbol)
                        target_partition_idx = -1
                        if target:
                            for idx, p in enumerate(partitions):
                                if target in p:
                                    target_partition_idx = idx
                                    break
                        signature.append(target_partition_idx)
                    
                    sig_tuple = tuple(signature)
                    if sig_tuple not in groups_by_signature:
                        groups_by_signature[sig_tuple] = set()
                    groups_by_signature[sig_tuple].add(state_id)
                
                # Add all split groups to new partitions
                for sub_group in groups_by_signature.values():
                    new_partitions.append(sub_group)
                    
                if len(groups_by_signature) > 1:
                    changed = True
            
            partitions = new_partitions
            iteration += 1
            if changed:
                steps.append({
                    'description': f'Iteration {iteration}: Refined partitions',
                    'partitions': [list(p) for p in partitions]
                })
        
        # 4. Construct Minimized DFA
        minimized_states = []
        minimized_transitions = []
        
        # Map old state ID -> new partition ID
        state_to_partition = {}
        for idx, p in enumerate(partitions):
            p_id = f"P{idx}"
            
            # Determine position (average of all states in partition)
            avg_x = sum(next(s['x'] for s in active_states if s['id'] == sid) for sid in p) / len(p)
            avg_y = sum(next(s['y'] for s in active_states if s['id'] == sid) for sid in p) / len(p)
            
            minimized_states.append({
                'id': p_id,
                'label': "{" + ",".join(p) + "}",
                'x': avg_x,
                'y': avg_y,
                'isStart': any(next(s['isStart'] for s in active_states if s['id'] == sid) for sid in p),
                'isFinal': any(next(s['isFinal'] for s in active_states if s['id'] == sid) for sid in p)
            })
            
            for sid in p:
                state_to_partition[sid] = p_id
                
        # Build transitions
        added_transitions = set()
        for p_idx, p in enumerate(partitions):
            p_id = f"P{p_idx}"
            rep_id = next(iter(p)) # Take one representative
            
            for symbol in alphabet:
                target = adj.get(rep_id, {}).get(symbol)
                if target and target in state_to_partition:
                    target_p_id = state_to_partition[target]
                    
                    trans_key = (p_id, target_p_id, symbol)
                    if trans_key not in added_transitions:
                        minimized_transitions.append({
                            'from': p_id,
                            'to': target_p_id,
                            'symbol': symbol
                        })
                        added_transitions.add(trans_key)

        return {
            'steps': steps,
            'minimized_dfa': {
                'states': minimized_states,
                'transitions': minimized_transitions,
                'alphabet': alphabet
            }
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

@app.route('/api/import-jflap', methods=['POST'])
def import_jflap():
    """Import JFLAP file content"""
    data = request.json
    xml_content = data.get('xml', '')
    
    dfa_data, error = DFAValidator.parse_jflap(xml_content)
    
    if dfa_data:
        return jsonify({'success': True, 'dfa': dfa_data})
    else:
        return jsonify({'success': False, 'error': error})

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