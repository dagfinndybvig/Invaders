# Flask Space Invaders Game

This project is a simple Flask web application that features a Space Invaders game. The application consists of several components, including HTML templates, CSS styles, and JavaScript for game logic.

## Project Structure

```
codespaces-flask-1
├── app.py                # Main entry point of the Flask application
├── requirements.txt      # Lists dependencies required for the application
├── templates
│   ├── index.html       # Navigation page with a welcome message
│   └── space.html       # Page for the Space Invaders game
├── static
│   ├── main.css         # CSS styles for the application
│   └── js
│       └── space.js     # JavaScript code for the Space Invaders game logic
└── README.md            # Documentation for the project
```

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd <path-to-codespaces-flask-1>
   ```

2. **Install Dependencies**
   Make sure you have Python and pip installed. Then, run:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Application**
   Start the Flask application by running:
   ```bash
   python app.py
   ```

4. **Access the Application**
   Open your web browser and go to `http://127.0.0.1:5000` to access the index page. From there, you can navigate to the Space Invaders game.

## Space Invaders Game

The Space Invaders game allows users to control a spaceship and shoot down incoming enemies. The game features:

- Player controls for moving left and right and shooting.
- Enemy movements and collision detection.
- A simple scoring system.

Enjoy playing the game and feel free to modify the code to enhance the experience!
