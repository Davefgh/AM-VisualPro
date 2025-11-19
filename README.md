# 🤖 Automata Visualizer Pro

A comprehensive, interactive DFA (Deterministic Finite Automaton) simulation and visualization tool built with Python Flask and vanilla JavaScript. Perfect for learning and teaching automata theory concepts.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-green.svg)
![Flask](https://img.shields.io/badge/flask-3.0-red.svg)

## ✨ Features

- 🎨 **Interactive Design**: Drag-and-drop interface for building DFAs
- ▶️ **Step-by-Step Debugger**: Visualize execution path with animation
- 🧪 **Batch Testing**: Test multiple strings simultaneously
- 💾 **Import/Export**: Save and load DFA definitions in JSON format
- 📊 **Statistics Dashboard**: Real-time DFA completeness tracking
- 🎯 **Pre-built Examples**: Learn from example automata
- 🔄 **Server-side Validation**: Backend API for DFA operations
- 🌐 **Cross-browser Compatible**: Works on Chrome, Firefox, Safari, Edge

## 📸 Screenshots

*(Coming soon)*

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Davefgh/AM-VisualPro.git
cd AM-VisualPro
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Run the application**
```bash
python app.py
```

4. **Open your browser**
Navigate to `http://localhost:5000`

## 📁 Project Structure

```
AM-VisualPro/
├── app.py                      # Flask backend server
├── requirements.txt            # Python dependencies
├── README.md                   # This file
├── .gitignore                 # Git ignore rules
│
├── templates/
│   └── index.html             # Main HTML template
│
├── static/
│   ├── css/
│   │   └── style.css          # Application styles (Safari compatible)
│   ├── js/
│   │   ├── dfa.js             # DFA logic class
│   │   ├── renderer.js        # Canvas rendering engine
│   │   └── app.js             # Main application controller
│   └── examples/
│       ├── binary-even.json   # Example: Even binary numbers
│       └── binary-div3.json   # Example: Divisible by 3
│
└── saved_dfas/                 # User-saved DFA files
```

## 🎓 How to Use

### Building a DFA

1. **Add States**: Click the ⚪ button, then click on the canvas to create states
2. **Add Transitions**: Click the ↗️ button, drag from one state to another
3. **Set Start State**: Click 🏁, then click on the desired start state
4. **Toggle Final States**: Click ◎, then click on states to mark as final/non-final
5. **Drag to Reposition**: In add state mode, drag states to organize your DFA

### Simulating Strings

1. Enter your input string in the "Input String" field
2. Click **"Load & Debug"** to start simulation
3. Use the controls at the bottom:
   - **◀** : Step backward (coming soon)
   - **▶** : Auto-run simulation
   - **▶|** : Step forward one symbol
   - **◼** : Stop simulation

### Batch Testing

1. Enter multiple test strings (one per line) in the "Test Suite" text area
2. Click **"Run Suite"** to test all strings
3. View PASS/FAIL results for each string

### Import/Export

- **Export**: Click "Export JSON" to download your DFA
- **Import**: Click "Import" and select a JSON file

## 🔧 API Endpoints

The Flask backend provides several API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serve main page |
| `/api/validate` | POST | Validate DFA structure |
| `/api/simulate` | POST | Simulate DFA on input string |
| `/api/batch-test` | POST | Run batch tests |
| `/api/minimize` | POST | Minimize DFA |
| `/api/save` | POST | Save DFA to server |
| `/api/load/<filename>` | GET | Load DFA from server |
| `/api/examples` | GET | Get example DFAs |

### Example API Usage

```javascript
// Simulate a DFA
fetch('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        dfa: dfaData,
        input: '0110'
    })
})
.then(res => res.json())
.then(data => console.log(data));
```

## 🎯 Example DFAs

### Binary Even Numbers
Accepts binary strings representing even numbers (ending in 0).

```json
{
  "states": [
    {"id": "q0", "x": 200, "y": 200, "isFinal": true, "isStart": true},
    {"id": "q1", "x": 400, "y": 200, "isFinal": false}
  ],
  "transitions": [
    {"from": "q0", "to": "q0", "symbol": "0"},
    {"from": "q0", "to": "q1", "symbol": "1"},
    {"from": "q1", "to": "q0", "symbol": "0"},
    {"from": "q1", "to": "q1", "symbol": "1"}
  ],
  "alphabet": ["0", "1"]
}
```

## 🛠️ Development

### Running in Development Mode

```bash
# Enable debug mode
export FLASK_ENV=development
python app.py
```

### Adding New Features

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Commit: `git commit -m "Add feature"`
5. Push: `git push origin feature-name`
6. Create a Pull Request

## 🐛 Troubleshooting

### Canvas not displaying
- Ensure your browser supports HTML5 Canvas
- Check browser console for JavaScript errors

### Import not working
- Verify JSON file structure matches expected format
- Check browser console for parsing errors

### Styles not loading
- Clear browser cache
- Verify Flask static files are configured correctly

## 📚 Learning Resources

- [Automata Theory Basics](https://en.wikipedia.org/wiki/Automata_theory)
- [DFA Definition](https://en.wikipedia.org/wiki/Deterministic_finite_automaton)
- [Regular Languages](https://en.wikipedia.org/wiki/Regular_language)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch
3. Commit your Changes
4. Push to the Branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **Davefgh** - *Initial work* - [GitHub](https://github.com/Davefgh)

## 🙏 Acknowledgments

- Inspired by JFLAP and other automata visualization tools
- Built for educational purposes
- Thanks to the Flask and JavaScript communities

## 📞 Contact

Project Link: [https://github.com/Davefgh/AM-VisualPro](https://github.com/Davefgh/AM-VisualPro)

---

⭐ Star this repo if you find it helpful!