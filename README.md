# Enzyme Temperature Simulation

A lightweight in-browser visualization of enzyme activity vs temperature. Demonstrates:

- Increasing reaction rate with temperature up to an optimum (~37°C)
- Decline in activity due to denaturation above the optimum
- Visual distortion of enzyme active sites as temperature exceeds 37°C
- Probabilistic denaturation: enzymes remain pristine until temperature first exceeds 37°C; higher temperatures progressively denature more enzymes
- Dramatic denatured morphology (irregular spikes + red fragmented active site)
- Real-time reaction rate measurement compared to a theoretical curve

## Features

- Canvas-based particle simulation: enzymes (blue) and substrates (yellow)
- Temperature slider (0–80°C)
- Dynamic denaturation visual: active site distortion increases with temperature > 37°C
- Real-time graph: theoretical rate curve + current temperature + measured rate point
- Product counter & rolling reaction rate (average over last 10 seconds)

## Running
Just open `index.html` in any modern browser (no build step required).

Requires a browser with native ES Module support (any current Chrome, Firefox, Safari, Edge). If you see errors like `Unexpected token 'export'`, make sure you didn't open the file in an extremely old browser or via a local file security restriction. Using a simple static server (example below) avoids some path issues on older setups:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Model Simplifications

- Reaction probability scales with: speed factor × temperature efficiency × remaining active-site integrity
- Speed uses a Q10-like rule (doubling ~ every 10°C) across full range (no post‑optimum slowdown) to illustrate collision theory distinctly from denaturation loss of function
- Denaturation: once temperature > 37°C, each whole-degree rise performs a probability trial for each still-native enzyme; denature severity then ramps gradually with further temperature increase
- Substrate is recycled after reaction to keep counts stable

## Extending

Ideas for future improvements:
- Different enzyme classes with unique optima and denaturation profiles
- Michaelis-Menten style saturation (vary substrate number)
- pH slider with combined effect matrix
- Export data (CSV) and pause/reset controls
- Replace abstract shapes with loaded SVG assets for enzymes & substrates

## License
MIT
